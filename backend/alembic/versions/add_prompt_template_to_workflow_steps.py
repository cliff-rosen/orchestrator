"""Add prompt_template to workflow steps

Revision ID: add_prompt_tmpl
Revises: remove_prompt_template_id
Create Date: 2024-02-03

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = 'add_prompt_tmpl'
down_revision = 'remove_prompt_template_id'
branch_labels = None
depends_on = None

def upgrade():
    # Add prompt_template column to workflow_steps table
    op.add_column('workflow_steps',
        sa.Column('prompt_template', sa.String(36), sa.ForeignKey('prompt_templates.template_id'), nullable=True)
    )

def downgrade():
    # Remove prompt_template column from workflow_steps table
    op.drop_column('workflow_steps', 'prompt_template') 