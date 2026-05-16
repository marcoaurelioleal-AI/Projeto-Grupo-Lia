from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import LeadershipEmployee, LeadershipRecord
from ..repositories.leadership_repository import LeadershipRepository
from ..schemas import (
    LeadershipEmployeeCreate,
    LeadershipEmployeeRead,
    LeadershipEmployeeUpdate,
    LeadershipRecordCreate,
    LeadershipRecordRead,
)


class LeadershipService:
    def __init__(self, db: Session) -> None:
        self.repository = LeadershipRepository(db)

    def list_employees(self) -> list[LeadershipEmployeeRead]:
        return [self._employee_read(employee) for employee in self.repository.list_employees()]

    def create_employee(self, payload: LeadershipEmployeeCreate) -> LeadershipEmployeeRead:
        employee = LeadershipEmployee(
            name=payload.name.strip(),
            store=payload.store.strip(),
            position=payload.position.strip() if payload.position else None,
        )
        self.repository.add_employee(employee)
        self.repository.commit()
        return self._employee_read(employee)

    def update_employee(self, employee_id: int, payload: LeadershipEmployeeUpdate) -> LeadershipEmployeeRead:
        employee = self._get_employee_or_404(employee_id)
        changes = payload.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] is not None:
            employee.name = changes["name"].strip()
        if "store" in changes and changes["store"] is not None:
            employee.store = changes["store"].strip()
        if "position" in changes:
            employee.position = changes["position"].strip() if changes["position"] else None
        if "active" in changes and changes["active"] is not None:
            employee.active = changes["active"]
        self.repository.commit()
        return self._employee_read(employee)

    def list_records(self, employee_id: int | None = None) -> list[LeadershipRecordRead]:
        return [self._record_read(record) for record in self.repository.list_records(employee_id=employee_id)]

    def create_record(
        self,
        employee_id: int,
        payload: LeadershipRecordCreate,
        created_by: str,
    ) -> LeadershipRecordRead:
        employee = self._get_employee_or_404(employee_id)
        if not employee.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Funcionario inativo nao pode receber novo registro",
            )
        record = LeadershipRecord(
            employee_id=employee.id,
            record_type=payload.record_type,
            description=payload.description.strip(),
            applied_at=payload.applied_at or date.today(),
            created_by=created_by,
        )
        self.repository.add_record(record)
        self.repository.commit()
        record.employee = employee
        return self._record_read(record)

    def _get_employee_or_404(self, employee_id: int) -> LeadershipEmployee:
        employee = self.repository.get_employee(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionario nao encontrado")
        return employee

    @staticmethod
    def _employee_read(employee: LeadershipEmployee) -> LeadershipEmployeeRead:
        return LeadershipEmployeeRead(
            id=employee.id,
            name=employee.name,
            store=employee.store,
            position=employee.position,
            active=employee.active,
            created_at=employee.created_at,
            record_count=len(employee.records or []),
        )

    @staticmethod
    def _record_read(record: LeadershipRecord) -> LeadershipRecordRead:
        return LeadershipRecordRead(
            id=record.id,
            employee_id=record.employee_id,
            employee_name=record.employee.name if record.employee else "",
            employee_store=record.employee.store if record.employee else "",
            record_type=record.record_type,
            description=record.description,
            applied_at=record.applied_at,
            created_at=record.created_at,
            created_by=record.created_by,
        )
