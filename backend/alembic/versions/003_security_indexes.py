"""Add security-related indexes

Revision ID: 003
Revises: 002
Create Date: 2025-03-06

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Index for efficient document listing sorted by updated_at
    op.create_index(
        'ix_documents_updated_at',
        'documents',
        ['updated_at'],
        postgresql_using='btree',
    )

    # Index for cleaning up stale sessions
    op.create_index(
        'ix_sessions_last_seen_at',
        'sessions',
        ['last_seen_at'],
        postgresql_using='btree',
    )


def downgrade() -> None:
    op.drop_index('ix_sessions_last_seen_at', table_name='sessions')
    op.drop_index('ix_documents_updated_at', table_name='documents')
