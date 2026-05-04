from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Manual, ManualSection, User
from ..schemas import ManualRead
from ..security import get_current_user

router = APIRouter(prefix="/manuals", tags=["manuals"])


@router.get("", response_model=list[ManualRead])
def list_manuals(
    unit: str | None = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Manual]:
    query = select(Manual).options(selectinload(Manual.sections).selectinload(ManualSection.steps)).order_by(Manual.unit)
    if unit:
        query = query.where(Manual.unit == unit)
    return list(db.scalars(query).all())
