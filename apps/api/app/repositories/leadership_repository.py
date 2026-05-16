from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import LeadershipEmployee, LeadershipRecord


class LeadershipRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_employees(self) -> list[LeadershipEmployee]:
        query = (
            select(LeadershipEmployee)
            .options(selectinload(LeadershipEmployee.records))
            .order_by(LeadershipEmployee.active.desc(), LeadershipEmployee.name)
        )
        return list(self.db.scalars(query).unique().all())

    def get_employee(self, employee_id: int) -> LeadershipEmployee | None:
        return self.db.scalar(
            select(LeadershipEmployee)
            .where(LeadershipEmployee.id == employee_id)
            .options(selectinload(LeadershipEmployee.records))
        )

    def add_employee(self, employee: LeadershipEmployee) -> LeadershipEmployee:
        self.db.add(employee)
        self.db.flush()
        self.db.refresh(employee)
        return employee

    def add_record(self, record: LeadershipRecord) -> LeadershipRecord:
        self.db.add(record)
        self.db.flush()
        self.db.refresh(record)
        return record

    def list_records(self, employee_id: int | None = None, limit: int = 80) -> list[LeadershipRecord]:
        query = (
            select(LeadershipRecord)
            .options(selectinload(LeadershipRecord.employee))
            .order_by(LeadershipRecord.applied_at.desc(), LeadershipRecord.created_at.desc())
            .limit(limit)
        )
        if employee_id:
            query = query.where(LeadershipRecord.employee_id == employee_id)
        return list(self.db.scalars(query).all())

    def commit(self) -> None:
        self.db.commit()
