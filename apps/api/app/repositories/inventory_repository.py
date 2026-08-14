from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..models import InventoryItem


class InventoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_items(self, store: str | None = None) -> list[InventoryItem]:
        query = (
            select(InventoryItem)
            .options(joinedload(InventoryItem.created_by))
            .order_by(InventoryItem.store, InventoryItem.product_name)
        )
        if store:
            query = query.where(InventoryItem.store == store)
        return list(self.db.scalars(query).all())

    def get_item(self, item_id: int) -> InventoryItem | None:
        return self.db.scalar(
            select(InventoryItem)
            .options(joinedload(InventoryItem.created_by))
            .where(InventoryItem.id == item_id)
        )

    def get_by_store_and_product(self, store: str, product_name: str) -> InventoryItem | None:
        return self.db.scalar(
            select(InventoryItem).where(
                InventoryItem.store == store,
                InventoryItem.product_name == product_name,
            )
        )

    def add(self, item: InventoryItem) -> InventoryItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete(self, item: InventoryItem) -> None:
        self.db.delete(item)
        self.db.commit()

    def commit(self) -> None:
        self.db.commit()
