import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PromptTemplate } from '../types/prompts';
import { toolApi } from '../lib/api/toolApi';

interface PromptTemplateContextType {
    templates: PromptTemplate[];
    selectedTemplate: PromptTemplate | null;
    isEditing: boolean;
    // Actions
    createTemplate: (template: Partial<PromptTemplate>) => Promise<PromptTemplate>;
    updateTemplate: (templateId: string, template: Partial<PromptTemplate>) => Promise<PromptTemplate>;
    deleteTemplate: (templateId: string) => Promise<void>;
    testTemplate: (template: Partial<PromptTemplate>, parameters: Record<string, string>) => Promise<any>;
    setSelectedTemplate: (template: PromptTemplate | null) => void;
    setIsEditing: (isEditing: boolean) => void;
    refreshTemplates: () => Promise<void>;
}

const PromptTemplateContext = createContext<PromptTemplateContextType | null>(null);

export const PromptTemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const refreshTemplates = useCallback(async () => {
        const fetchedTemplates = await toolApi.getPromptTemplates();
        setTemplates(fetchedTemplates);
    }, []);

    useEffect(() => {
        refreshTemplates();
    }, [refreshTemplates]);

    const createTemplate = async (template: Partial<PromptTemplate>) => {
        const newTemplate = await toolApi.createPromptTemplate(template);
        await refreshTemplates();
        return newTemplate;
    };

    const updateTemplate = async (templateId: string, template: Partial<PromptTemplate>) => {
        const updatedTemplate = await toolApi.updatePromptTemplate(templateId, template);
        await refreshTemplates();
        return updatedTemplate;
    };

    const deleteTemplate = async (templateId: string) => {
        await toolApi.deletePromptTemplate(templateId);
        await refreshTemplates();
        setSelectedTemplate(null);
    };

    const testTemplate = async (template: Partial<PromptTemplate>, parameters: Record<string, string>) => {
        return await toolApi.testPromptTemplate(template, parameters);
    };

    return (
        <PromptTemplateContext.Provider value={{
            templates,
            selectedTemplate,
            isEditing,
            createTemplate,
            updateTemplate,
            deleteTemplate,
            testTemplate,
            setSelectedTemplate,
            setIsEditing,
            refreshTemplates
        }}>
            {children}
        </PromptTemplateContext.Provider>
    );
};

export const usePromptTemplates = () => {
    const context = useContext(PromptTemplateContext);
    if (!context) {
        throw new Error('usePromptTemplates must be used within a PromptTemplateProvider');
    }
    return context;
}; 