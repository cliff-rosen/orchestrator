"""merge prompt template tokens

Revision ID: merge_prompt_template_tokens
Revises: update_prompt_templates
Create Date: 2024-03-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
import json

# revision identifiers, used by Alembic.
revision = 'merge_prompt_template_tokens'
down_revision = 'update_prompt_templates'
branch_labels = None
depends_on = None

def upgrade():
    # Add new tokens column
    op.add_column('prompt_templates', 
                  sa.Column('tokens', sa.JSON(), nullable=False, 
                           server_default='[]'))
    
    # Migrate existing data
    connection = op.get_bind()
    prompt_templates = connection.execute(
        'SELECT template_id, regular_tokens, file_tokens FROM prompt_templates'
    )
    
    for template in prompt_templates:
        # Convert old format to new format
        regular_tokens = json.loads(template.regular_tokens or '[]')
        file_tokens = json.loads(template.file_tokens or '[]')
        
        new_tokens = (
            [{'name': token, 'type': 'string'} for token in regular_tokens] +
            [{'name': token, 'type': 'file'} for token in file_tokens]
        )
        
        # Update with new format
        connection.execute(
            'UPDATE prompt_templates SET tokens = %s WHERE template_id = %s',
            (json.dumps(new_tokens), template.template_id)
        )
    
    # Drop old columns
    op.drop_column('prompt_templates', 'regular_tokens')
    op.drop_column('prompt_templates', 'file_tokens')

def downgrade():
    # Add back old columns
    op.add_column('prompt_templates',
                  sa.Column('regular_tokens', sa.JSON(), 
                           nullable=False, server_default='[]'))
    op.add_column('prompt_templates',
                  sa.Column('file_tokens', sa.JSON(), 
                           nullable=False, server_default='[]'))
    
    # Migrate data back
    connection = op.get_bind()
    prompt_templates = connection.execute(
        'SELECT template_id, tokens FROM prompt_templates'
    )
    
    for template in prompt_templates:
        tokens = json.loads(template.tokens or '[]')
        
        regular_tokens = [t['name'] for t in tokens if t['type'] == 'string']
        file_tokens = [t['name'] for t in tokens if t['type'] == 'file']
        
        connection.execute(
            '''UPDATE prompt_templates 
               SET regular_tokens = %s, file_tokens = %s 
               WHERE template_id = %s''',
            (json.dumps(regular_tokens), json.dumps(file_tokens), 
             template.template_id)
        )
    
    # Drop new column
    op.drop_column('prompt_templates', 'tokens') 