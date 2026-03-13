/**
 * WorkflowExecutor 单元测试
 */
import { describe, it, expect, beforeEach } from './testFramework.js';
import { WorkflowExecutor } from '../core/WorkflowExecutor.js';

const executor = new WorkflowExecutor();

describe('WorkflowExecutor', () => {
    describe('evaluateCondition', () => {
        it('should evaluate > correctly', () => {
            expect(executor.evaluateCondition(10, '>', 5)).toBe(true);
            expect(executor.evaluateCondition(3, '>', 5)).toBe(false);
            expect(executor.evaluateCondition(5, '>', 5)).toBe(false);
        });

        it('should evaluate < correctly', () => {
            expect(executor.evaluateCondition(3, '<', 5)).toBe(true);
            expect(executor.evaluateCondition(10, '<', 5)).toBe(false);
            expect(executor.evaluateCondition(5, '<', 5)).toBe(false);
        });

        it('should evaluate == correctly', () => {
            expect(executor.evaluateCondition(5, '==', 5)).toBe(true);
            expect(executor.evaluateCondition(3, '==', 5)).toBe(false);
        });

        it('should evaluate >= correctly', () => {
            expect(executor.evaluateCondition(5, '>=', 5)).toBe(true);
            expect(executor.evaluateCondition(10, '>=', 5)).toBe(true);
            expect(executor.evaluateCondition(3, '>=', 5)).toBe(false);
        });

        it('should evaluate <= correctly', () => {
            expect(executor.evaluateCondition(5, '<=', 5)).toBe(true);
            expect(executor.evaluateCondition(3, '<=', 5)).toBe(true);
            expect(executor.evaluateCondition(10, '<=', 5)).toBe(false);
        });

        it('should handle string numbers', () => {
            expect(executor.evaluateCondition('10', '>', 5)).toBe(true);
            expect(executor.evaluateCondition('3', '<', 5)).toBe(true);
        });
    });

    describe('topologicalSort', () => {
        it('should sort nodes with no connections', () => {
            const nodes = new Map([
                ['node_1', { id: 'node_1' }],
                ['node_2', { id: 'node_2' }]
            ]);
            const connections = [];
            
            const result = executor.topologicalSort(nodes, connections);
            expect(result.length).toBe(2);
            expect(result).toContain('node_1');
            expect(result).toContain('node_2');
        });

        it('should sort linear workflow correctly', () => {
            const nodes = new Map([
                ['node_1', { id: 'node_1' }],
                ['node_2', { id: 'node_2' }],
                ['node_3', { id: 'node_3' }]
            ]);
            const connections = [
                { from: 'node_1', to: 'node_2' },
                { from: 'node_2', to: 'node_3' }
            ];
            
            const result = executor.topologicalSort(nodes, connections);
            expect(result).toEqual(['node_1', 'node_2', 'node_3']);
        });

        it('should handle branching workflow', () => {
            const nodes = new Map([
                ['node_1', { id: 'node_1' }],
                ['node_2', { id: 'node_2' }],
                ['node_3', { id: 'node_3' }]
            ]);
            const connections = [
                { from: 'node_1', to: 'node_2' },
                { from: 'node_1', to: 'node_3' }
            ];
            
            const result = executor.topologicalSort(nodes, connections);
            expect(result[0]).toBe('node_1');
            expect(result.length).toBe(3);
        });

        it('should detect cycle in workflow', () => {
            const nodes = new Map([
                ['node_1', { id: 'node_1' }],
                ['node_2', { id: 'node_2' }],
                ['node_3', { id: 'node_3' }]
            ]);
            const connections = [
                { from: 'node_1', to: 'node_2' },
                { from: 'node_2', to: 'node_3' },
                { from: 'node_3', to: 'node_1' }
            ];
            
            const result = executor.topologicalSort(nodes, connections);
            expect(result.length).not.toBe(nodes.size);
        });
    });

    describe('execute', () => {
        it('should throw error when cycle exists', () => {
            const nodes = new Map([
                ['node_1', { id: 'node_1', type: 'number-input', data: {} }],
                ['node_2', { id: 'node_2', type: 'condition', data: {} }]
            ]);
            const connections = [
                { from: 'node_1', to: 'node_2' },
                { from: 'node_2', to: 'node_1' }
            ];
            
            expect(() => executor.execute(nodes, connections)).toThrow();
        });
    });
});

// 运行测试
if (typeof window !== 'undefined') {
    console.log('Running WorkflowExecutor tests...');
}
