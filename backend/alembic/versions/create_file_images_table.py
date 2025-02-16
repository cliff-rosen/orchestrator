"""create file images table

Revision ID: create_file_images_table
Revises: add_extracted_text_and_images, add_prompt_tmpl
Create Date: 2024-03-20 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import LONGBLOB


# revision identifiers, used by Alembic.
revision = 'create_file_images_table'
down_revision = ('add_extracted_text_and_images', 'add_prompt_tmpl')
branch_labels = None
depends_on = None


def upgrade():
    # Create file_images table with LONGBLOB for image_data
    op.create_table('file_images',
        sa.Column('image_id', sa.String(36), primary_key=True, index=True),
        sa.Column('file_id', sa.String(36), sa.ForeignKey('files.file_id'), nullable=False),
        sa.Column('image_data', LONGBLOB, nullable=False),
        sa.Column('mime_type', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP'))
    )


def downgrade():
    # Drop the file_images table
    op.drop_table('file_images') 