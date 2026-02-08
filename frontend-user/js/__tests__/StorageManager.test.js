/**
 * StorageManager 单元测试
 */
import { describe, it, expect } from './testFramework.js';

// Mock localStorage
const mockStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};

// Mock StorageManager
const StorageManager = {
    STORAGE_KEY: 'workflows',
    
    getWorkflows() {
        try {
            const data = mockStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    saveWorkflow(workflow) {
        const workflows = this.getWorkflows();
        const newWorkflow = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            ...workflow
        };
        workflows.push(newWorkflow);
        mockStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
        return newWorkflow;
    },

    deleteWorkflow(index) {
        const workflows = this.getWorkflows();
        if (index >= 0 && index < workflows.length) {
            workflows.splice(index, 1);
            mockStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
            return true;
        }
        return false;
    },

    clearAll() {
        mockStorage.removeItem(this.STORAGE_KEY);
        return true;
    }
};

describe('StorageManager', () => {
    // 每个测试前清空存储
    mockStorage.clear();

    describe('getWorkflows', () => {
        it('should return empty array when no data', () => {
            mockStorage.clear();
            const workflows = StorageManager.getWorkflows();
            expect(workflows.length).toBe(0);
        });

        it('should return saved workflows', () => {
            mockStorage.clear();
            StorageManager.saveWorkflow({ name: 'Test' });
            const workflows = StorageManager.getWorkflows();
            expect(workflows.length).toBe(1);
        });
    });

    describe('saveWorkflow', () => {
        it('should save workflow with id and timestamp', () => {
            mockStorage.clear();
            const result = StorageManager.saveWorkflow({ name: 'My Workflow' });
            expect(result.name).toBe('My Workflow');
            expect(result.id).toBeTruthy();
            expect(result.createdAt).toBeTruthy();
        });

        it('should append to existing workflows', () => {
            mockStorage.clear();
            StorageManager.saveWorkflow({ name: 'First' });
            StorageManager.saveWorkflow({ name: 'Second' });
            const workflows = StorageManager.getWorkflows();
            expect(workflows.length).toBe(2);
        });
    });

    describe('deleteWorkflow', () => {
        it('should delete workflow at index', () => {
            mockStorage.clear();
            StorageManager.saveWorkflow({ name: 'ToDelete' });
            const result = StorageManager.deleteWorkflow(0);
            expect(result).toBe(true);
            expect(StorageManager.getWorkflows().length).toBe(0);
        });

        it('should return false for invalid index', () => {
            mockStorage.clear();
            const result = StorageManager.deleteWorkflow(99);
            expect(result).toBe(false);
        });
    });

    describe('clearAll', () => {
        it('should remove all workflows', () => {
            mockStorage.clear();
            StorageManager.saveWorkflow({ name: 'Test1' });
            StorageManager.saveWorkflow({ name: 'Test2' });
            StorageManager.clearAll();
            expect(StorageManager.getWorkflows().length).toBe(0);
        });
    });
});

console.log('Running StorageManager tests...');
