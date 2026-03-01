"""Add document versions table

Revision ID: 002
Revises: 001
Create Date: 2025-01-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'document_versions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
        sa.Column('y_state', sa.LargeBinary(), nullable=True),
        sa.Column('created_by', sa.String(100), nullable=True),  # User who triggered the snapshot
        sa.Column('snapshot_type', sa.String(20), nullable=False, server_default='auto'),  # 'auto' or 'manual'
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.UniqueConstraint('document_id', 'version_number', name='uq_document_version'),
    )

    # Index for fast version lookups
    op.create_index('ix_document_versions_document_id', 'document_versions', ['document_id'])
    op.create_index('ix_document_versions_created_at', 'document_versions', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_document_versions_created_at')
    op.drop_index('ix_document_versions_document_id')
    op.drop_table('document_versions')
