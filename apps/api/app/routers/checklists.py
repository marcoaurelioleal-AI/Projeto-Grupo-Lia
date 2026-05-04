from __future__ import annotations

from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import ChecklistRun, ChecklistRunItem, User
from ..schemas import ChecklistItemRead, ChecklistItemUpdate, ChecklistRunRead, ClosingNoteUpdate
from ..security import get_current_user
from ..seed import ensure_runs_for_date

router = APIRouter(prefix="/checklists", tags=["checklists"])


def serialize_run(run: ChecklistRun) -> ChecklistRunRead:
    total = len(run.items)
    completed = sum(1 for item in run.items if item.done)
    progress = round((completed / total) * 100) if total else 0
    return ChecklistRunRead(
        id=run.id,
        title=run.template.title,
        category=run.template.category,
        store=run.store,
        run_date=run.run_date,
        progress=progress,
        completed=completed,
        total=total,
        closing_note=run.closing_note,
        items=[
            ChecklistItemRead(
                id=item.id,
                section=item.template_item.section,
                text=item.template_item.text,
                done=item.done,
                completed_at=item.completed_at,
                completed_by=item.completed_by.name if item.completed_by else None,
            )
            for item in run.items
        ],
    )


@router.get("", response_model=list[ChecklistRunRead])
def list_checklists(
    run_date: date | None = None,
    store: str = "Grupo Lia",
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ChecklistRunRead]:
    target_date = run_date or date.today()
    runs = ensure_runs_for_date(db, target_date, store)
    return [serialize_run(run) for run in runs]


@router.patch("/{run_id}/items", response_model=ChecklistRunRead)
def update_checklist_item(
    run_id: int,
    payload: ChecklistItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChecklistRunRead:
    item = db.scalar(
        select(ChecklistRunItem)
        .options(selectinload(ChecklistRunItem.run), selectinload(ChecklistRunItem.template_item))
        .where(ChecklistRunItem.id == payload.item_id, ChecklistRunItem.run_id == run_id)
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item de checklist não encontrado")
    item.done = payload.done
    item.completed_at = datetime.now(UTC).replace(tzinfo=None) if payload.done else None
    item.completed_by_user_id = user.id if payload.done else None
    db.commit()

    run = db.scalar(
        select(ChecklistRun)
        .options(
            selectinload(ChecklistRun.template),
            selectinload(ChecklistRun.items).selectinload(ChecklistRunItem.template_item),
            selectinload(ChecklistRun.items).selectinload(ChecklistRunItem.completed_by),
        )
        .where(ChecklistRun.id == run_id)
    )
    if not run:
        raise HTTPException(status_code=404, detail="Checklist não encontrado")
    return serialize_run(run)


@router.patch("/{run_id}/closing-note", response_model=ChecklistRunRead)
def update_closing_note(
    run_id: int,
    payload: ClosingNoteUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChecklistRunRead:
    run = db.scalar(
        select(ChecklistRun)
        .options(
            selectinload(ChecklistRun.template),
            selectinload(ChecklistRun.items).selectinload(ChecklistRunItem.template_item),
            selectinload(ChecklistRun.items).selectinload(ChecklistRunItem.completed_by),
        )
        .where(ChecklistRun.id == run_id)
    )
    if not run:
        raise HTTPException(status_code=404, detail="Checklist não encontrado")
    run.closing_note = payload.closing_note
    db.commit()
    db.refresh(run)
    return serialize_run(run)
