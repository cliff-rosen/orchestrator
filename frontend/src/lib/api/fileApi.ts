import { api } from './index';

export interface FileInfo {
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
    async uploadFile(file: globalThis.File, description?: string): Promise<FileInfo> {
        const formData = new FormData();
        formData.append('file', file);
        if (description) {
            formData.append('description', description);
        }
        const response = await api.post('/api/files', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Get all files
    async getFiles(): Promise<FileInfo[]> {
        const response = await api.get('/api/files');
        return response.data;
    },

    // Get a specific file
    async getFile(fileId: string): Promise<FileInfo> {
        const response = await api.get(`/api/files/${fileId}`);
        return response.data;
    },

    // Get a file's content
    async getFileContent(fileId: string): Promise<FileContent> {
        const response = await api.get(`/api/files/${fileId}/content`);
        return response.data;
    },

    // Update a file
    async updateFile(fileId: string, updates: Partial<FileInfo>): Promise<FileInfo> {
        const response = await api.put(`/api/files/${fileId}`, updates);
        return response.data;
    },

    // Delete a file
    async deleteFile(fileId: string): Promise<void> {
        await api.delete(`/api/files/${fileId}`);
    }
}; 