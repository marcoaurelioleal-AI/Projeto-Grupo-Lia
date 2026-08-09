from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import WasteCreate, WasteRead, WasteSummaryRead
from ..security import get_current_user
from ..services.inventory_service import InventoryService

router = APIRouter(prefix="/waste", tags=["waste"])


def get_inventory_service(db: Session = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("", response_model=list[WasteRead], response_model_exclude_none=True)
def list_waste(
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> list[WasteRead]:
    return service.list_waste(user)


@router.get("/summary", response_model=WasteSummaryRead, response_model_exclude_none=True)
def waste_summary(
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> WasteSummaryRead:
    return service.waste_summary(user)


@router.post("", response_model=WasteRead, response_model_exclude_none=True)
def create_waste(
    payload: WasteCreate,
    user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> WasteRead:
    return service.create_waste(payload, user)
