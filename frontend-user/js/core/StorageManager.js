/**
 * 存储管理器 - 处理工作流数据持久化
 */
import Logger from '../utils/Logger.js';

const STORAGE_KEY = 'workflows';

export class StorageManager {
    constructor() {
        Logger.debug('StorageManager initialized');
    }

    getWorkflows() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            Logger.error('Failed to load workflows', error);
            return [];
        }
    }

    saveWorkflow(workflow) {
        try {
            const workflows = this.getWorkflows();
            const newWorkflow = {
                id: Date.now(),
                createdAt: new Date().toISOString(),
                ...workflow
            };
            workflows.push(newWorkflow);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
            Logger.info('Workflow saved', { name: workflow.name });
            return newWorkflow;
        } catch (error) {
            Logger.error('Failed to save workflow', error);
            throw error;
        }
    }

    deleteWorkflow(index) {
        try {
            const workflows = this.getWorkflows();
            if (index >= 0 && index < workflows.length) {
                const deleted = workflows.splice(index, 1)[0];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
                Logger.info('Workflow deleted', { name: deleted.name });
                return true;
            }
            return false;
        } catch (error) {
            Logger.error('Failed to delete workflow', error);
            return false;
        }
    }

    getWorkflow(index) {
        const workflows = this.getWorkflows();
        return workflows[index] || null;
    }

    clearAll() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            Logger.info('All workflows cleared');
            return true;
        } catch (error) {
            Logger.error('Failed to clear workflows', error);
            return false;
        }
    }

    exportData() {
        const workflows = this.getWorkflows();
        return JSON.stringify(workflows, null, 2);
    }

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format');
            }
            
            const existing = this.getWorkflows();
            const merged = [...existing, ...data];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            Logger.info('Data imported', { count: data.length });
            return data.length;
        } catch (error) {
            Logger.error('Failed to import data', error);
            throw error;
        }
    }

    getStorageInfo() {
        const workflows = this.getWorkflows();
        const dataStr = JSON.stringify(workflows);
        return {
            count: workflows.length,
            sizeBytes: new Blob([dataStr]).size,
            sizeKB: (new Blob([dataStr]).size / 1024).toFixed(2)
        };
    }
}

export default new StorageManager();
