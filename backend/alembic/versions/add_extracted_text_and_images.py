"""add extracted_text and images

Revision ID: add_extracted_text_and_images
Revises: None
Create Date: 2024-02-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_extracted_text_and_images'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add extracted_text column to files table
    op.add_column('files', sa.Column('extracted_text', sa.Text(), nullable=True))

def downgrade() -> None:
    # Remove extracted_text column from files table
    op.drop_column('files', 'extracted_text') 