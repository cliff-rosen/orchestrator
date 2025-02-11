import { api } from './index';

export interface File {
    file_id: string;
    name: string;
    description?: string;
    mime_type: string;
    size: number;
    created_at: string;
    updated_at: string;
}

export interface FileContent {
    content: string;
}

export const fileApi = {
    // Upload a new file
    async uploadFile(file: File, description?: string): Promise<File> {
        const formData = new FormData();
        formData.append('file', file);
        if (description) {
            formData.append('description', description);
        }
        const response = await api.post('/files', formData);
        return response.data;
    },

    // Get all files
    async getFiles(): Promise<File[]> {
        const response = await api.get('/files');
        return response.data;
    },

    // Get a specific file
    async getFile(fileId: string): Promise<File> {
        const response = await api.get(`/files/${fileId}`);
        return response.data;
    },

    // Get a file's content
    async getFileContent(fileId: string): Promise<FileContent> {
        const response = await api.get(`/files/${fileId}/content`);
        return response.data;
    },

    // Update a file
    async updateFile(fileId: string, updates: Partial<File>): Promise<File> {
        const response = await api.put(`/files/${fileId}`, updates);
        return response.data;
    },

    // Delete a file
    async deleteFile(fileId: string): Promise<void> {
        await api.delete(`/files/${fileId}`);
    }
}; 