"""Add document ownership fields

Revision ID: 004
Revises: 003
Create Date: 2025-03-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add created_by column for document ownership
    op.add_column(
        'documents',
        sa.Column('created_by', sa.String(100), nullable=True)
    )

    # Add is_public flag (default True for backward compatibility)
    op.add_column(
        'documents',
        sa.Column('is_public', sa.Boolean(), server_default='true', nullable=False)
    )

    # Index for efficient ownership queries
    op.create_index(
        'ix_documents_created_by',
        'documents',
        ['created_by'],
        postgresql_using='btree',
    )

    # Index for efficient public/private filtering
    op.create_index(
        'ix_documents_is_public',
        'documents',
        ['is_public'],
        postgresql_using='btree',
    )


def downgrade() -> None:
    op.drop_index('ix_documents_is_public', table_name='documents')
    op.drop_index('ix_documents_created_by', table_name='documents')
    op.drop_column('documents', 'is_public')
    op.drop_column('documents', 'created_by')
