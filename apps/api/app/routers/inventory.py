from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import (
    InventoryAdjustmentCreate,
    InventoryBalanceCreate,
    InventoryCostUpdate,
    InventoryItemRead,
    InventoryItemUpdate,
    InventoryMovementCreate,
    InventoryMovementRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    StoreRead,
)
from ..security import get_current_user
from ..services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])


def get_inventory_service(db: Session = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("/units", response_model=list[StoreRead])
def list_inventory_units(
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> list[StoreRead]:
    return service.list_units(user)


@router.get("/products", response_model=list[ProductRead])
def list_products(
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> list[ProductRead]:
    return service.list_products(user)


@router.post("/products", response_model=ProductRead)
def create_product(
    payload: ProductCreate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> ProductRead:
    return service.create_product(payload, user)


@router.patch("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> ProductRead:
    return service.update_product(product_id, payload, user)


@router.get("", response_model=list[InventoryItemRead], response_model_exclude_none=True)
def list_inventory_items(
    store_id: int | None = None,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> list[InventoryItemRead]:
    return service.list_items(user=user, store_id=store_id)


@router.post("/balances", response_model=InventoryItemRead, response_model_exclude_none=True)
def create_inventory_balance(
    payload: InventoryBalanceCreate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryItemRead:
    return service.create_balance(payload, user)


@router.patch("/{item_id}", response_model=InventoryItemRead)
def reject_silent_inventory_overwrite(
    item_id: int,
    _: InventoryItemUpdate,
    user: User = Depends(get_current_user),
) -> InventoryItemRead:
    del item_id, user
    raise HTTPException(status_code=400, detail="Use uma movimentação ou contagem para alterar o estoque")


@router.post(
    "/{item_id}/movements",
    response_model=InventoryMovementRead,
    response_model_exclude_none=True,
)
def create_inventory_movement(
    item_id: int,
    payload: InventoryMovementCreate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryMovementRead:
    return service.create_movement(item_id, payload, user)


@router.post(
    "/{item_id}/adjustments",
    response_model=InventoryMovementRead,
    response_model_exclude_none=True,
)
def adjust_inventory_balance(
    item_id: int,
    payload: InventoryAdjustmentCreate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryMovementRead:
    return service.adjust_balance(item_id, payload, user)


@router.post(
    "/{item_id}/cost",
    response_model=InventoryMovementRead,
    response_model_exclude_none=True,
)
def update_inventory_cost(
    item_id: int,
    payload: InventoryCostUpdate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryMovementRead:
    return service.update_cost(item_id, payload, user)


@router.get(
    "/{item_id}/movements",
    response_model=list[InventoryMovementRead],
    response_model_exclude_none=True,
)
def list_inventory_movements(
    item_id: int,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> list[InventoryMovementRead]:
    return service.list_movements(item_id, user)
