/**
 * WorkflowExecutor 单元测试
 */
import { describe, it, expect, beforeEach } from './testFramework.js';

// Mock WorkflowExecutor 核心逻辑
const WorkflowExecutor = {
    evaluateCondition(input, operator, compare) {
        const numInput = Number(input);
        switch (operator) {
            case '>': return numInput > compare;
            case '<': return numInput < compare;
            case '==': return numInput == compare;
            case '>=': return numInput >= compare;
            case '<=': return numInput <= compare;
            default: return false;
        }
    },

    topologicalSort(nodes, connections) {
        const inDegree = new Map();
        const result = [];
        const queue = [];

        nodes.forEach((_, id) => inDegree.set(id, 0));
        connections.forEach(conn => {
            inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
        });

        inDegree.forEach((degree, id) => {
            if (degree === 0) queue.push(id);
        });

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);
            connections
                .filter(c => c.from === current)
                .forEach(c => {
                    inDegree.set(c.to, inDegree.get(c.to) - 1);
                    if (inDegree.get(c.to) === 0) queue.push(c.to);
                });
        }

        return result;
    }
};

describe('WorkflowExecutor', () => {
    describe('evaluateCondition', () => {
        it('should evaluate > correctly', () => {
            expect(WorkflowExecutor.evaluateCondition(10, '>', 5)).toBe(true);
            expect(WorkflowExecutor.evaluateCondition(3, '>', 5)).toBe(false);
            expect(WorkflowExecutor.evaluateCondition(5, '>', 5)).toBe(false);
        });

        it('should evaluate < correctly', () => {
            expect(WorkflowExecutor.evaluateCondition(3, '<', 5)).toBe(true);
            expect(WorkflowExecutor.evaluateCondition(10, '<', 5)).toBe(false);
            expect(WorkflowExecutor.evaluateCondition(5, '<', 5)).toBe(false);
        });

        it('should evaluate == correctly', () => {
            expect(WorkflowExecutor.evaluateCondition(5, '==', 5)).toBe(true);
            expect(WorkflowExecutor.evaluateCondition(3, '==', 5)).toBe(false);
        });

        it('should evaluate >= correctly', () => {
            expect(WorkflowExecutor.evaluateCondition(5, '>=', 5)).toBe(true);
            expect(WorkflowExecutor.evaluateCondition(10, '>=', 5)).toBe(true);
            expect(WorkflowExecutor.evaluateCondition(3, '>=', 5)).toBe(false);
        });

        it('should evaluate <= correctly', () => {
            expect(WorkflowExecutor.evaluateCondition(5, '<=', 5)).toBe(true);
            expect(WorkflowExecutor.evaluateCondition(3, '<=', 5)).toBe(true);
            expect(WorkflowExecutor.evaluateCondition(10, '<=', 5)).toBe(false);
        });

        it('should handle string numbers', () => {
            expect(WorkflowExecutor.evaluateCondition('10', '>', 5)).toBe(true);
            expect(WorkflowExecutor.evaluateCondition('3', '<', 5)).toBe(true);
        });
    });

    describe('topologicalSort', () => {
        it('should sort nodes with no connections', () => {
            const nodes = new Map([
                ['node_1', { id: 'node_1' }],
                ['node_2', { id: 'node_2' }]
            ]);
            const connections = [];
            
            const result = WorkflowExecutor.topologicalSort(nodes, connections);
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
            
            const result = WorkflowExecutor.topologicalSort(nodes, connections);
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
            
            const result = WorkflowExecutor.topologicalSort(nodes, connections);
            expect(result[0]).toBe('node_1');
            expect(result.length).toBe(3);
        });
    });
});

// 运行测试
if (typeof window !== 'undefined') {
    console.log('Running WorkflowExecutor tests...');
}
