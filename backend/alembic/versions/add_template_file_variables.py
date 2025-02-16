"""rename variables to tokens

Revision ID: add_template_file_variables
Revises: create_file_images_table
Create Date: 2024-03-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_template_file_variables'
down_revision = 'create_file_images_table'
branch_labels = None
depends_on = None

def upgrade():
    # Update prompt_templates table
    with op.batch_alter_table('prompt_templates') as batch_op:
        # Rename regular_variables to regular_tokens
        batch_op.alter_column('regular_variables', 
                            new_column_name='regular_tokens',
                            existing_type=sa.JSON())
        
        # Rename file_variables to file_tokens
        batch_op.alter_column('file_variables',
                            new_column_name='file_tokens',
                            existing_type=sa.JSON())
        
        # Add system_message column if it doesn't exist
        batch_op.add_column(sa.Column('system_message', sa.Text(), 
                                    nullable=True))

def downgrade():
    # Update prompt_templates table
    with op.batch_alter_table('prompt_templates') as batch_op:
        # Rename tokens back to variables
        batch_op.alter_column('regular_tokens', 
                            new_column_name='regular_variables',
                            existing_type=sa.JSON())
        
        batch_op.alter_column('file_tokens',
                            new_column_name='file_variables',
                            existing_type=sa.JSON())
        
        # Remove system_message column
        batch_op.drop_column('system_message')

    # Update workflow_variables table
    with op.batch_alter_table('workflow_variables') as batch_op:
        # Add type column
        batch_op.add_column(sa.Column('type', sa.String(50), 
                                    nullable=False, server_default='string'))

    # Revert workflow_variables changes
    with op.batch_alter_table('workflow_variables') as batch_op:
        batch_op.drop_column('type') 