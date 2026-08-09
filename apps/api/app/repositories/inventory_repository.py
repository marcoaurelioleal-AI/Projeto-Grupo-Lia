from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..models import (
    InventoryItem,
    InventoryMovement,
    InventoryTransfer,
    InventoryTransferItem,
    Product,
    Store,
    WasteRecord,
)


class InventoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_products(self) -> list[Product]:
        return list(self.db.scalars(select(Product).order_by(Product.name)).all())

    def get_product(self, product_id: int) -> Product | None:
        return self.db.get(Product, product_id)

    def get_product_by_name(self, name: str) -> Product | None:
        return self.db.scalar(select(Product).where(Product.name == name))

    def add_product(self, product: Product) -> Product:
        self.db.add(product)
        self.db.flush()
        return product

    def get_store(self, store_id: int, *, for_update: bool = False) -> Store | None:
        query = select(Store).where(Store.id == store_id, Store.active.is_(True))
        if for_update:
            query = query.with_for_update(of=Store)
        return self.db.scalar(query)

    def list_stores(self) -> list[Store]:
        return list(self.db.scalars(select(Store).where(Store.active.is_(True)).order_by(Store.name)).all())

    def list_items(self, store_id: int | None = None) -> list[InventoryItem]:
        query = (
            select(InventoryItem)
            .options(
                joinedload(InventoryItem.created_by),
                joinedload(InventoryItem.product),
                joinedload(InventoryItem.store_unit),
            )
            .where(InventoryItem.active.is_(True))
            .order_by(InventoryItem.store, InventoryItem.product_name)
        )
        if store_id is not None:
            query = query.where(InventoryItem.store_id == store_id)
        return list(self.db.scalars(query).unique().all())

    def get_item(self, item_id: int, *, for_update: bool = False) -> InventoryItem | None:
        if for_update:
            return self.db.scalar(
                select(InventoryItem).where(InventoryItem.id == item_id).with_for_update(of=InventoryItem)
            )
        query = (
            select(InventoryItem)
            .options(
                joinedload(InventoryItem.created_by),
                joinedload(InventoryItem.product),
                joinedload(InventoryItem.store_unit),
            )
            .where(InventoryItem.id == item_id)
        )
        return self.db.scalar(query)

    def get_balance(self, store_id: int, product_id: int, *, for_update: bool = False) -> InventoryItem | None:
        query = select(InventoryItem).where(
            InventoryItem.store_id == store_id,
            InventoryItem.product_id == product_id,
        )
        if for_update:
            query = query.with_for_update(of=InventoryItem)
        return self.db.scalar(query)

    def add_item(self, item: InventoryItem) -> InventoryItem:
        self.db.add(item)
        self.db.flush()
        return item

    def add_movement(self, movement: InventoryMovement) -> InventoryMovement:
        self.db.add(movement)
        self.db.flush()
        return movement

    def list_movements(self, item_id: int) -> list[InventoryMovement]:
        return list(
            self.db.scalars(
                select(InventoryMovement)
                .options(joinedload(InventoryMovement.created_by))
                .where(InventoryMovement.inventory_item_id == item_id)
                .order_by(InventoryMovement.created_at.desc(), InventoryMovement.id.desc())
            ).all()
        )

    def list_items_by_product(self, product_id: int) -> list[InventoryItem]:
        return list(self.db.scalars(select(InventoryItem).where(InventoryItem.product_id == product_id)).all())

    def add_transfer(self, transfer: InventoryTransfer) -> InventoryTransfer:
        self.db.add(transfer)
        self.db.flush()
        return transfer

    def get_transfer(self, transfer_id: int, *, for_update: bool = False) -> InventoryTransfer | None:
        if for_update:
            return self.db.scalar(
                select(InventoryTransfer)
                .where(InventoryTransfer.id == transfer_id)
                .with_for_update(of=InventoryTransfer)
            )
        query = (
            select(InventoryTransfer)
            .options(
                joinedload(InventoryTransfer.source_store),
                joinedload(InventoryTransfer.destination_store),
                joinedload(InventoryTransfer.sent_by),
                joinedload(InventoryTransfer.received_by),
                selectinload(InventoryTransfer.items).joinedload(InventoryTransferItem.product),
            )
            .where(InventoryTransfer.id == transfer_id)
        )
        return self.db.scalar(query)

    def list_transfers(self, store_id: int | None = None) -> list[InventoryTransfer]:
        query = (
            select(InventoryTransfer)
            .options(
                joinedload(InventoryTransfer.source_store),
                joinedload(InventoryTransfer.destination_store),
                joinedload(InventoryTransfer.sent_by),
                joinedload(InventoryTransfer.received_by),
                selectinload(InventoryTransfer.items).joinedload(InventoryTransferItem.product),
            )
            .order_by(InventoryTransfer.sent_at.desc(), InventoryTransfer.id.desc())
        )
        if store_id is not None:
            query = query.where(
                (InventoryTransfer.source_store_id == store_id)
                | (InventoryTransfer.destination_store_id == store_id)
            )
        return list(self.db.scalars(query).unique().all())

    def add_waste(self, waste: WasteRecord) -> WasteRecord:
        self.db.add(waste)
        self.db.flush()
        return waste

    def list_waste(self, store_id: int | None = None) -> list[WasteRecord]:
        query = (
            select(WasteRecord)
            .options(
                joinedload(WasteRecord.store_unit),
                joinedload(WasteRecord.product),
                joinedload(WasteRecord.created_by),
            )
            .order_by(WasteRecord.created_at.desc(), WasteRecord.id.desc())
        )
        if store_id is not None:
            query = query.where(WasteRecord.store_id == store_id)
        return list(self.db.scalars(query).all())

    def commit(self) -> None:
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()
