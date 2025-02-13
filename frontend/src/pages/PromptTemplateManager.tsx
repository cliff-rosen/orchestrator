import React from 'react';
import { usePromptTemplates } from '../context/PromptTemplateContext';
import PromptTemplateEditor from '../components/PromptTemplateEditor';
import AssetList from '../components/common/AssetList';

const PromptTemplateManager: React.FC = () => {
    const {
        templates,
        selectedTemplate,
        setSelectedTemplate,
        isEditing,
        setIsEditing,
        deleteTemplate
    } = usePromptTemplates();

    const handleCreateNew = () => {
        setSelectedTemplate(null);
        setIsEditing(true);
    };

    const handleEdit = (templateId: string) => {
        const template = templates.find(t => t.template_id === templateId);
        if (template) {
            setSelectedTemplate(template);
            setIsEditing(true);
        }
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
        <>
            <AssetList
                title="Prompt Templates"
                assets={assets}
                onCreateNew={handleCreateNew}
                onEdit={handleEdit}
                onDelete={deleteTemplate}
                createButtonText="Create New Template"
                emptyStateMessage="No prompt templates found. Create one to get started."
            />

            {isEditing && (
                <PromptTemplateEditor
                    template={selectedTemplate}
                />
            )}
        </>
    );
};

export default PromptTemplateManager; 