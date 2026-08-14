from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import InventoryItem, User
from ..repositories.inventory_repository import InventoryRepository
from ..schemas import InventoryItemCreate, InventoryItemRead, InventoryItemUpdate
from ..store_catalog import DEFAULT_OPERATIONAL_STORE
from .permission_service import require_store_access, require_user_permission


class InventoryService:
    def __init__(self, db: Session) -> None:
        self.repository = InventoryRepository(db)

    def list_items(self, user: User, store: str | None = None) -> list[InventoryItemRead]:
        require_user_permission(user, "manage_inventory")
        store = require_store_access(user, store) if store else require_store_access(user, None)
        return [self.serialize_item(item) for item in self.repository.list_items(store=store)]

    def create_item(self, payload: InventoryItemCreate, user: User) -> InventoryItemRead:
        require_user_permission(user, "manage_inventory")
        product_name = payload.product_name.strip()
        if not product_name:
            raise HTTPException(status_code=400, detail="Nome do produto é obrigatório")
        store = require_store_access(user, payload.store.strip() or DEFAULT_OPERATIONAL_STORE)

        existing = self.repository.get_by_store_and_product(store, product_name)
        if existing:
            existing.quantity = Decimal(str(payload.quantity))
            existing.unit = payload.unit
            self.repository.commit()
            refreshed = self.repository.get_item(existing.id)
            return self.serialize_item(refreshed or existing)

        item = InventoryItem(
            store=store,
            product_name=product_name,
            quantity=Decimal(str(payload.quantity)),
            unit=payload.unit,
            created_by_user_id=user.id,
        )
        item = self.repository.add(item)
        return self.serialize_item(self.repository.get_item(item.id) or item)

    def update_item(self, item_id: int, payload: InventoryItemUpdate, user: User) -> InventoryItemRead:
        require_user_permission(user, "manage_inventory")
        item = self.repository.get_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Produto de estoque não encontrado")
        require_store_access(user, item.store)

        changes = payload.model_dump(exclude_unset=True)
        if "store" in changes and changes["store"] is not None:
            item.store = require_store_access(user, changes["store"].strip() or DEFAULT_OPERATIONAL_STORE)
        if "product_name" in changes and changes["product_name"] is not None:
            product_name = changes["product_name"].strip()
            if not product_name:
                raise HTTPException(status_code=400, detail="Nome do produto é obrigatório")
            item.product_name = product_name
        if "quantity" in changes and changes["quantity"] is not None:
            item.quantity = Decimal(str(changes["quantity"]))
        if "unit" in changes and changes["unit"] is not None:
            item.unit = changes["unit"]

        self.repository.commit()
        refreshed = self.repository.get_item(item_id)
        if not refreshed:
            raise HTTPException(status_code=404, detail="Produto de estoque não encontrado")
        return self.serialize_item(refreshed)

    def delete_item(self, item_id: int, user: User) -> None:
        require_user_permission(user, "manage_inventory")
        item = self.repository.get_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Produto de estoque não encontrado")
        require_store_access(user, item.store)
        self.repository.delete(item)

    @staticmethod
    def serialize_item(item: InventoryItem) -> InventoryItemRead:
        return InventoryItemRead(
            id=item.id,
            store=item.store,
            product_name=item.product_name,
            quantity=float(item.quantity),
            unit=item.unit,
            created_by=item.created_by.name if item.created_by else None,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
