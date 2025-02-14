import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePromptTemplates } from '../context/PromptTemplateContext';
import AssetList from '../components/common/AssetList';

const PromptTemplateManager: React.FC = () => {
    const navigate = useNavigate();
    const {
        templates,
        deleteTemplate
    } = usePromptTemplates();

    const handleCreateNew = () => {
        navigate('/prompt/new');
    };

    const handleEdit = (templateId: string) => {
        navigate(`/prompt/${templateId}`);
    };

    const assets = templates.map(template => ({
        id: template.template_id,
        name: template.name,
        description: template.description,
        metadata: [
            {
                label: 'variables',
                value: template.tokens?.length || 0
            },
            {
                label: template.output_schema.type === 'object' ? 'output fields' : 'text output',
                value: template.output_schema.type === 'object'
                    ? Object.keys(template.output_schema.fields || {}).length
                    : 1
            }
        ]
    }));

    return (
        <AssetList
            title="Prompt Templates"
            assets={assets}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDelete={deleteTemplate}
            createButtonText="Create New Template"
            emptyStateMessage="No prompt templates found. Create one to get started."
        />
    );
};

export default PromptTemplateManager; 