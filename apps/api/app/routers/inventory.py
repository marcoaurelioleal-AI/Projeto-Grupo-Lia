from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import InventoryItemCreate, InventoryItemRead, InventoryItemUpdate
from ..security import get_current_user
from ..services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])


def get_inventory_service(db: Session = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("", response_model=list[InventoryItemRead])
def list_inventory_items(
    store: str | None = None,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> list[InventoryItemRead]:
    return service.list_items(user=user, store=store)


@router.post("", response_model=InventoryItemRead)
def create_inventory_item(
    payload: InventoryItemCreate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryItemRead:
    return service.create_item(payload, user)


@router.patch("/{item_id}", response_model=InventoryItemRead)
def update_inventory_item(
    item_id: int,
    payload: InventoryItemUpdate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> InventoryItemRead:
    return service.update_item(item_id, payload, user)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_inventory_item(
    item_id: int,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> Response:
    service.delete_item(item_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
