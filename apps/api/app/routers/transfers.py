from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import TransferCreate, TransferRead, TransferReceive
from ..security import get_current_user
from ..services.inventory_service import InventoryService

router = APIRouter(prefix="/transfers", tags=["transfers"])


def get_inventory_service(db: Session = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("", response_model=list[TransferRead], response_model_exclude_none=True)
def list_transfers(
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> list[TransferRead]:
    return service.list_transfers(user)


@router.post("", response_model=TransferRead, response_model_exclude_none=True)
def create_transfer(
    payload: TransferCreate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> TransferRead:
    return service.create_transfer(payload, user)


@router.post("/{transfer_id}/receive", response_model=TransferRead, response_model_exclude_none=True)
def receive_transfer(
    transfer_id: int,
    payload: TransferReceive,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> TransferRead:
    return service.receive_transfer(transfer_id, payload, user)
