"""harden the Supabase public schema

Revision ID: 20260806_0013
Revises: 20260519_0012
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op


revision = "20260806_0013"
down_revision = "20260519_0012"
branch_labels = None
depends_on = None


PUBLIC_TABLES = (
    "alembic_version",
    "users",
    "manuals",
    "manual_sections",
    "manual_steps",
    "checklist_templates",
    "checklist_template_items",
    "checklist_runs",
    "checklist_run_items",
    "ai_chat_sessions",
    "ai_chat_logs",
    "operational_incidents",
    "checklist_evidences",
    "stores",
    "ai_interactions",
    "leadership_employees",
    "leadership_records",
    "ai_knowledge_chunks",
    "audit_logs",
    "inventory_items",
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table_name in PUBLIC_TABLES:
        op.execute(f'ALTER TABLE public."{table_name}" ENABLE ROW LEVEL SECURITY')

    op.execute(
        "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public "
        "FROM anon, authenticated, service_role"
    )
    op.execute(
        "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public "
        "FROM anon, authenticated, service_role"
    )
    op.execute("REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC")

    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public "
        "REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated, service_role"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public "
        "REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated, service_role"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public "
        "REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public "
        "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC"
    )


def downgrade() -> None:
    raise RuntimeError(
        "Esta migration de seguranca e intencionalmente irreversivel; "
        "restaurar os grants publicos reabriria a vulnerabilidade."
    )
