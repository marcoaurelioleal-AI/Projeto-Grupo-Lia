from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import (
    InventoryItem,
    InventoryMovement,
    InventoryTransfer,
    InventoryTransferItem,
    Product,
    User,
    WasteRecord,
    utc_now,
)
from ..repositories.inventory_repository import InventoryRepository
from ..schemas import (
    InventoryAdjustmentCreate,
    InventoryBalanceCreate,
    InventoryCostUpdate,
    InventoryItemRead,
    InventoryMovementCreate,
    InventoryMovementRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    StoreRead,
    TransferCreate,
    TransferRead,
    TransferReceive,
    TransferItemRead,
    WasteCreate,
    WasteRead,
    WasteSummaryRead,
)
from .permission_service import (
    require_user_permission,
    user_has_global_store_access,
    user_has_permission,
)

QUANTITY_STEP = Decimal("0.001")
COST_STEP = Decimal("0.0001")
TOTAL_STEP = Decimal("0.01")


def _quantity(value: Decimal) -> Decimal:
    return value.quantize(QUANTITY_STEP, rounding=ROUND_HALF_UP)


def _cost(value: Decimal) -> Decimal:
    return value.quantize(COST_STEP, rounding=ROUND_HALF_UP)


class InventoryService:
    def __init__(self, db: Session) -> None:
        self.repository = InventoryRepository(db)

    def list_products(self, user: User) -> list[ProductRead]:
        require_user_permission(user, "view_inventory")
        return [self._product_read(product) for product in self.repository.list_products() if product.active]

    def list_units(self, user: User) -> list[StoreRead]:
        require_user_permission(user, "view_inventory")
        return [StoreRead.model_validate(store) for store in self.repository.list_stores()]

    def create_product(self, payload: ProductCreate, user: User) -> ProductRead:
        require_user_permission(user, "manage_inventory_catalog")
        name = payload.name.strip()
        unit = payload.unit.strip()
        if self.repository.get_product_by_name(name):
            raise HTTPException(status_code=409, detail="Produto já cadastrado")
        product = self.repository.add_product(Product(name=name, unit=unit, active=True))
        self.repository.commit()
        return self._product_read(product)

    def update_product(self, product_id: int, payload: ProductUpdate, user: User) -> ProductRead:
        require_user_permission(user, "manage_inventory_catalog")
        product = self.repository.get_product(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        changes = payload.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] is not None:
            name = changes["name"].strip()
            existing = self.repository.get_product_by_name(name)
            if existing and existing.id != product.id:
                raise HTTPException(status_code=409, detail="Produto já cadastrado")
            product.name = name
            for balance in self.repository.list_items_by_product(product.id):
                balance.product_name = name
        if "unit" in changes and changes["unit"] is not None:
            product.unit = changes["unit"].strip()
        if "active" in changes and changes["active"] is not None:
            product.active = changes["active"]
        self.repository.commit()
        return self._product_read(product)

    def list_items(self, user: User, store_id: int | None = None) -> list[InventoryItemRead]:
        require_user_permission(user, "view_inventory")
        scoped_store_id = self._scoped_store_id(user, store_id)
        include_costs = user_has_permission(user, "view_inventory_costs")
        return [self._item_read(item, include_costs) for item in self.repository.list_items(scoped_store_id)]

    def create_balance(self, payload: InventoryBalanceCreate, user: User) -> InventoryItemRead:
        require_user_permission(user, "manage_inventory_catalog")
        store_id = self._scoped_store_id(user, payload.store_id)
        if store_id is None:
            store_id = payload.store_id
        store = self.repository.get_store(store_id)
        product = self.repository.get_product(payload.product_id)
        if not store or not product or not product.active:
            raise HTTPException(status_code=404, detail="Unidade ou produto não encontrado")
        if self.repository.get_balance(store_id, product.id):
            raise HTTPException(status_code=409, detail="Saldo já cadastrado para esta unidade")

        item = self.repository.add_item(
            InventoryItem(
                store=store.name,
                product_name=product.name,
                store_id=store.id,
                product_id=product.id,
                quantity=_quantity(payload.quantity),
                unit_cost=_cost(payload.unit_cost),
                active=True,
                created_by_user_id=user.id,
            )
        )
        if item.quantity > 0:
            self.repository.add_movement(
                InventoryMovement(
                    inventory_item_id=item.id,
                    movement_type="saldo_inicial",
                    quantity_delta=item.quantity,
                    quantity_before=Decimal("0"),
                    quantity_after=item.quantity,
                    unit_cost_snapshot=item.unit_cost,
                    reason="Saldo inicial",
                    created_by_user_id=user.id,
                )
            )
        self.repository.commit()
        saved = self.repository.get_item(item.id)
        return self._item_read(saved or item, include_costs=True)

    def create_movement(
        self,
        item_id: int,
        payload: InventoryMovementCreate,
        user: User,
    ) -> InventoryMovementRead:
        require_user_permission(user, "move_inventory")
        item = self._item_for_write(item_id, user)
        amount = _quantity(payload.quantity)
        delta = -amount if payload.movement_type == "saida" else amount
        movement = self._apply_delta(
            item,
            delta=delta,
            movement_type=payload.movement_type,
            reason=payload.reason.strip(),
            notes=payload.notes.strip() if payload.notes else None,
            user=user,
        )
        self.repository.commit()
        return self._movement_read(movement, include_costs=user_has_permission(user, "view_inventory_costs"))

    def adjust_balance(
        self,
        item_id: int,
        payload: InventoryAdjustmentCreate,
        user: User,
    ) -> InventoryMovementRead:
        require_user_permission(user, "adjust_inventory")
        item = self._item_for_write(item_id, user)
        target = _quantity(payload.counted_quantity)
        movement = self._apply_delta(
            item,
            delta=target - item.quantity,
            movement_type="ajuste",
            reason=payload.reason.strip(),
            notes=payload.notes.strip() if payload.notes else None,
            user=user,
        )
        self.repository.commit()
        return self._movement_read(movement, include_costs=user_has_permission(user, "view_inventory_costs"))

    def update_cost(self, item_id: int, payload: InventoryCostUpdate, user: User) -> InventoryMovementRead:
        require_user_permission(user, "adjust_inventory")
        require_user_permission(user, "view_inventory_costs")
        item = self._item_for_write(item_id, user)
        item.unit_cost = _cost(payload.unit_cost)
        movement = self._apply_delta(
            item,
            delta=Decimal("0"),
            movement_type="custo_atualizado",
            reason=payload.reason.strip(),
            notes=None,
            user=user,
        )
        self.repository.commit()
        return self._movement_read(movement, include_costs=True)

    def list_movements(self, item_id: int, user: User) -> list[InventoryMovementRead]:
        require_user_permission(user, "view_inventory_audit")
        item = self.repository.get_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item de estoque não encontrado")
        self._assert_store_access(user, item.store_id)
        include_costs = user_has_permission(user, "view_inventory_costs")
        return [self._movement_read(movement, include_costs) for movement in self.repository.list_movements(item_id)]

    def create_transfer(self, payload: TransferCreate, user: User) -> TransferRead:
        require_user_permission(user, "move_inventory")
        source_store_id = payload.source_store_id or user.store_id
        if source_store_id is None:
            raise HTTPException(status_code=400, detail="Unidade de origem obrigatória")
        self._assert_store_access(user, source_store_id)
        if source_store_id == payload.destination_store_id:
            raise HTTPException(status_code=400, detail="Origem e destino devem ser diferentes")
        source_store = self.repository.get_store(source_store_id)
        destination_store = self.repository.get_store(payload.destination_store_id)
        if not source_store or not destination_store:
            raise HTTPException(status_code=404, detail="Unidade de origem ou destino não encontrada")

        transfer = self.repository.add_transfer(
            InventoryTransfer(
                source_store_id=source_store.id,
                destination_store_id=destination_store.id,
                status="enviada",
                notes=payload.notes.strip() if payload.notes else None,
                sent_by_user_id=user.id,
            )
        )
        seen_products: set[int] = set()
        try:
            for requested in sorted(payload.items, key=lambda item: item.product_id):
                if requested.product_id in seen_products:
                    raise HTTPException(status_code=400, detail="Produto duplicado na transferência")
                seen_products.add(requested.product_id)
                item = self.repository.get_balance(source_store.id, requested.product_id, for_update=True)
                if not item:
                    raise HTTPException(status_code=404, detail="Produto sem saldo na unidade de origem")
                amount = _quantity(requested.quantity)
                movement = self._apply_delta(
                    item,
                    delta=-amount,
                    movement_type="transferencia_saida",
                    reason=f"Transferência para {destination_store.name}",
                    notes=transfer.notes,
                    user=user,
                    transfer_id=transfer.id,
                )
                transfer.items.append(
                    InventoryTransferItem(
                        product_id=item.product_id,
                        source_inventory_item_id=item.id,
                        quantity_sent=amount,
                        unit_cost_snapshot=item.unit_cost,
                    )
                )
                movement.transfer_id = transfer.id
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise
        saved = self.repository.get_transfer(transfer.id)
        return self._transfer_read(saved or transfer, user)

    def receive_transfer(self, transfer_id: int, payload: TransferReceive, user: User) -> TransferRead:
        require_user_permission(user, "move_inventory")
        transfer = self.repository.get_transfer(transfer_id, for_update=True)
        if not transfer:
            raise HTTPException(status_code=404, detail="Transferência não encontrada")
        self._assert_store_access(user, transfer.destination_store_id)
        if transfer.status != "enviada":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transferência já recebida")

        received_by_id = {item.transfer_item_id: _quantity(item.quantity_received) for item in payload.items}
        expected_ids = {item.id for item in transfer.items}
        if set(received_by_id) != expected_ids:
            raise HTTPException(status_code=400, detail="Todos os itens da transferência devem ser conferidos")
        has_discrepancy = any(received_by_id[item.id] != item.quantity_sent for item in transfer.items)
        if has_discrepancy and not (payload.discrepancy_note and payload.discrepancy_note.strip()):
            raise HTTPException(status_code=400, detail="Justificativa obrigatória para divergência")

        try:
            self.repository.get_store(transfer.destination_store_id, for_update=True)
            for transfer_item in transfer.items:
                received_quantity = received_by_id[transfer_item.id]
                destination = self.repository.get_balance(
                    transfer.destination_store_id,
                    transfer_item.product_id,
                    for_update=True,
                )
                if not destination:
                    destination_store = self.repository.get_store(transfer.destination_store_id)
                    product = self.repository.get_product(transfer_item.product_id)
                    if not destination_store or not product:
                        raise HTTPException(status_code=404, detail="Unidade ou produto não encontrado")
                    destination = self.repository.add_item(
                        InventoryItem(
                            store=destination_store.name,
                            product_name=product.name,
                            store_id=destination_store.id,
                            product_id=product.id,
                            quantity=Decimal("0"),
                            unit_cost=transfer_item.unit_cost_snapshot,
                            active=True,
                            created_by_user_id=user.id,
                        )
                    )
                before = _quantity(destination.quantity)
                if received_quantity > 0:
                    total_value = (before * destination.unit_cost) + (
                        received_quantity * transfer_item.unit_cost_snapshot
                    )
                    destination.unit_cost = _cost(total_value / (before + received_quantity))
                movement = self._apply_delta(
                    destination,
                    delta=received_quantity,
                    movement_type="transferencia_entrada",
                    reason=f"Recebimento da transferência {transfer.id}",
                    notes=payload.discrepancy_note.strip() if payload.discrepancy_note else None,
                    user=user,
                    transfer_id=transfer.id,
                )
                movement.unit_cost_snapshot = transfer_item.unit_cost_snapshot
                transfer_item.quantity_received = received_quantity
                transfer_item.destination_inventory_item_id = destination.id

            transfer.status = "divergente" if has_discrepancy else "recebida"
            transfer.discrepancy_note = payload.discrepancy_note.strip() if payload.discrepancy_note else None
            transfer.received_by_user_id = user.id
            transfer.received_at = utc_now()
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise
        saved = self.repository.get_transfer(transfer.id)
        return self._transfer_read(saved or transfer, user)

    def list_transfers(self, user: User) -> list[TransferRead]:
        require_user_permission(user, "view_inventory")
        store_id = None if user_has_global_store_access(user) else user.store_id
        return [self._transfer_read(transfer, user) for transfer in self.repository.list_transfers(store_id)]

    def create_waste(self, payload: WasteCreate, user: User) -> WasteRead:
        require_user_permission(user, "move_inventory")
        item = self._item_for_write(payload.inventory_item_id, user)
        amount = _quantity(payload.quantity)
        try:
            movement = self._apply_delta(
                item,
                delta=-amount,
                movement_type="perda",
                reason=payload.reason,
                notes=payload.notes.strip() if payload.notes else None,
                user=user,
            )
            waste = self.repository.add_waste(
                WasteRecord(
                    inventory_item_id=item.id,
                    inventory_movement_id=movement.id,
                    store_id=item.store_id,
                    product_id=item.product_id,
                    quantity=amount,
                    reason=payload.reason,
                    notes=payload.notes.strip() if payload.notes else None,
                    unit_cost_snapshot=item.unit_cost,
                    total_cost=(amount * item.unit_cost).quantize(TOTAL_STEP, rounding=ROUND_HALF_UP),
                    created_by_user_id=user.id,
                )
            )
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise
        return self._waste_read(waste, user)

    def list_waste(self, user: User) -> list[WasteRead]:
        require_user_permission(user, "view_inventory")
        store_id = None if user_has_global_store_access(user) else user.store_id
        return [self._waste_read(waste, user) for waste in self.repository.list_waste(store_id)]

    def waste_summary(self, user: User) -> WasteSummaryRead:
        require_user_permission(user, "view_inventory")
        store_id = None if user_has_global_store_access(user) else user.store_id
        records = self.repository.list_waste(store_id)
        by_reason: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for record in records:
            by_reason[record.reason] += record.quantity
        include_costs = user_has_permission(user, "view_inventory_costs")
        return WasteSummaryRead(
            total_quantity=sum((record.quantity for record in records), Decimal("0")),
            total_cost=sum((record.total_cost for record in records), Decimal("0")) if include_costs else None,
            record_count=len(records),
            by_reason=dict(by_reason),
        )

    def _item_for_write(self, item_id: int, user: User) -> InventoryItem:
        item = self.repository.get_item(item_id, for_update=True)
        if not item or not item.active:
            raise HTTPException(status_code=404, detail="Item de estoque não encontrado")
        self._assert_store_access(user, item.store_id)
        return item

    def _apply_delta(
        self,
        item: InventoryItem,
        *,
        delta: Decimal,
        movement_type: str,
        reason: str,
        notes: str | None,
        user: User,
        transfer_id: int | None = None,
    ) -> InventoryMovement:
        before = _quantity(item.quantity)
        after = _quantity(before + delta)
        if after < 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Estoque insuficiente")
        item.quantity = after
        return self.repository.add_movement(
            InventoryMovement(
                inventory_item_id=item.id,
                movement_type=movement_type,
                quantity_delta=_quantity(delta),
                quantity_before=before,
                quantity_after=after,
                unit_cost_snapshot=_cost(item.unit_cost),
                reason=reason,
                notes=notes,
                transfer_id=transfer_id,
                created_by_user_id=user.id,
            )
        )

    def _scoped_store_id(self, user: User, requested_store_id: int | None) -> int | None:
        if user_has_global_store_access(user):
            return requested_store_id
        if user.store_id is None:
            raise HTTPException(status_code=403, detail="Usuário sem unidade vinculada")
        if requested_store_id is not None and requested_store_id != user.store_id:
            raise HTTPException(status_code=403, detail="Acesso restrito à unidade do usuário")
        return user.store_id

    def _assert_store_access(self, user: User, store_id: int | None) -> None:
        if store_id is None:
            raise HTTPException(status_code=400, detail="Item sem unidade vinculada")
        self._scoped_store_id(user, store_id)

    @staticmethod
    def _product_read(product: Product) -> ProductRead:
        return ProductRead(id=product.id, name=product.name, unit=product.unit, active=product.active)

    @staticmethod
    def _item_read(item: InventoryItem, include_costs: bool) -> InventoryItemRead:
        return InventoryItemRead(
            id=item.id,
            store_id=item.store_id,
            store=item.store_unit.name if item.store_unit else item.store,
            product_id=item.product_id,
            product_name=item.product.name if item.product else item.product_name,
            unit=item.product.unit if item.product else "unidade",
            quantity=item.quantity,
            unit_cost=item.unit_cost if include_costs else None,
            active=item.active,
            created_by=item.created_by.name if item.created_by else None,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )

    @staticmethod
    def _movement_read(movement: InventoryMovement, include_costs: bool) -> InventoryMovementRead:
        return InventoryMovementRead(
            id=movement.id,
            inventory_item_id=movement.inventory_item_id,
            movement_type=movement.movement_type,
            quantity_delta=movement.quantity_delta,
            quantity_before=movement.quantity_before,
            quantity_after=movement.quantity_after,
            unit_cost_snapshot=movement.unit_cost_snapshot if include_costs else None,
            reason=movement.reason,
            notes=movement.notes,
            created_by=movement.created_by.name if movement.created_by else None,
            created_at=movement.created_at,
        )

    @staticmethod
    def _transfer_read(transfer: InventoryTransfer, user: User) -> TransferRead:
        include_costs = user_has_permission(user, "view_inventory_costs")
        return TransferRead(
            id=transfer.id,
            source_store_id=transfer.source_store_id,
            source_store=transfer.source_store.name if transfer.source_store else "",
            destination_store_id=transfer.destination_store_id,
            destination_store=transfer.destination_store.name if transfer.destination_store else "",
            status=transfer.status,
            notes=transfer.notes,
            discrepancy_note=transfer.discrepancy_note,
            sent_by=transfer.sent_by.name if transfer.sent_by else None,
            received_by=transfer.received_by.name if transfer.received_by else None,
            sent_at=transfer.sent_at,
            received_at=transfer.received_at,
            items=[
                TransferItemRead(
                    id=item.id,
                    product_id=item.product_id,
                    product_name=item.product.name if item.product else "",
                    unit=item.product.unit if item.product else "unidade",
                    quantity_sent=item.quantity_sent,
                    quantity_received=item.quantity_received,
                    unit_cost_snapshot=item.unit_cost_snapshot if include_costs else None,
                )
                for item in transfer.items
            ],
        )

    @staticmethod
    def _waste_read(waste: WasteRecord, user: User) -> WasteRead:
        include_costs = user_has_permission(user, "view_inventory_costs")
        return WasteRead(
            id=waste.id,
            inventory_item_id=waste.inventory_item_id,
            store_id=waste.store_id,
            store=waste.store_unit.name if waste.store_unit else "",
            product_id=waste.product_id,
            product_name=waste.product.name if waste.product else "",
            unit=waste.product.unit if waste.product else "unidade",
            quantity=waste.quantity,
            reason=waste.reason,
            notes=waste.notes,
            unit_cost_snapshot=waste.unit_cost_snapshot if include_costs else None,
            total_cost=waste.total_cost if include_costs else None,
            created_by=waste.created_by.name if waste.created_by else None,
            created_at=waste.created_at,
        )
