/**
 * 工作流执行器 - 运行工作流并计算结果
 */
import Logger from '../utils/Logger.js';

export class WorkflowExecutor {
    constructor() {
        Logger.debug('WorkflowExecutor initialized');
    }

    execute(nodes, connections) {
        const results = [];
        const nodeValues = new Map();
        
        Logger.info('Executing workflow', { 
            nodeCount: nodes.size, 
            connectionCount: connections.length 
        });

        // 拓扑排序
        const sorted = this.topologicalSort(nodes, connections);
        
        if (sorted.length === 0 && nodes.size > 0) {
            throw new Error('工作流存在循环依赖');
        }

        // 按顺序执行每个节点
        sorted.forEach(nodeId => {
            const node = nodes.get(nodeId);
            if (!node) return;

            const result = this.executeNode(node, nodeValues, connections);
            nodeValues.set(nodeId, result.value);
            results.push(result);
        });

        Logger.info('Workflow execution completed', { resultCount: results.length });
        return results;
    }

    executeNode(node, nodeValues, connections) {
        const inputs = this.getInputValues(node.id, nodeValues, connections);
        let value;
        let description;

        switch (node.type) {
            case 'number-input':
                if (inputs.length > 0) {
                    const parsed = parseFloat(inputs[0]);
                    value = isNaN(parsed) ? (parseFloat(node.data.value) || 0) : parsed;
                } else {
                    value = parseFloat(node.data.value) || 0;
                }
                description = `📥 数字输入: ${value}`;
                break;

            case 'text-input':
                if (inputs.length > 0) {
                    value = inputs.map(v => String(v)).join('') + (node.data.value || '');
                } else {
                    value = node.data.value || '';
                }
                description = `📝 文字输入: "${value}"`;
                break;

            case 'condition':
                const inputValue = inputs.length > 0 ? inputs[0] : 0;
                const compareValue = parseFloat(node.data.compareValue) || 0;
                const operator = node.data.operator;
                
                value = this.evaluateCondition(inputValue, operator, compareValue);
                const resultText = value ? '✅ 真' : '❌ 假';
                description = `🔀 条件判断: ${inputValue} ${operator} ${compareValue} = ${resultText}`;
                break;

            case 'output':
                value = inputs.length > 0 ? inputs.join(', ') : '无输入';
                description = `📤 输出结果: ${value}`;
                
                // 更新输出节点显示
                this.updateOutputDisplay(node.id, value);
                node.data.result = String(value);
                break;

            default:
                value = null;
                description = `⚠️ 未知节点类型: ${node.type}`;
        }

        return { nodeId: node.id, type: node.type, value, description };
    }

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
    }

    getInputValues(nodeId, nodeValues, connections) {
        return connections
            .filter(c => c.to === nodeId)
            .map(c => nodeValues.get(c.from))
            .filter(v => v !== undefined);
    }

    updateOutputDisplay(nodeId, value) {
        const element = document.getElementById(nodeId);
        if (element) {
            const display = element.querySelector('.output-display');
            if (display) {
                display.textContent = String(value);
                display.classList.remove('empty');
            }
        }
    }

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
                    if (inDegree.get(c.to) === 0) {
                        queue.push(c.to);
                    }
                });
        }

        return result;
    }
}

export default new WorkflowExecutor();
