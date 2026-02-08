/**
 * 节点管理器 - 管理工作流节点
 */
import Logger from '../utils/Logger.js';
import eventBus from '../utils/EventEmitter.js';
import { NODE_TYPES } from '../config/NodeTypes.js';

export class NodeManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.nodes = new Map();
        this.nodeIdCounter = 0;
        this.selectedNode = null;

        Logger.debug('NodeManager initialized');
    }

    createNode(type, x, y) {
        const id = `node_${++this.nodeIdCounter}`;
        const config = NODE_TYPES[type];
        
        if (!config) {
            Logger.error('Unknown node type', { type });
            return null;
        }

        const node = {
            id,
            type,
            x: Math.max(0, x),
            y: Math.max(0, y),
            data: { ...config.defaultData }
        };

        this.nodes.set(id, node);
        this.renderNode(node);
        this.updateEmptyState();
        
        Logger.info('Node created', { id, type });
        eventBus.emit('toast', { message: '组件已添加', type: 'success' });
        
        return node;
    }

    renderNode(node) {
        const config = NODE_TYPES[node.type];
        const element = document.createElement('div');
        element.className = 'workflow-node';
        element.id = node.id;
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;

        element.innerHTML = this.getNodeHTML(node, config);
        this.bindNodeEvents(element, node);
        this.canvas.appendChild(element);
    }

    getNodeHTML(node, config) {
        let bodyHTML = '';
        
        switch (node.type) {
            case 'number-input':
                bodyHTML = `
                    <div class="node-input-group">
                        <label>数值</label>
                        <input type="number" class="node-input" data-field="value" value="${node.data.value}">
                    </div>`;
                break;
            case 'text-input':
                bodyHTML = `
                    <div class="node-input-group">
                        <label>文本内容</label>
                        <input type="text" class="node-input" data-field="value" value="${node.data.value}" placeholder="请输入文本...">
                    </div>`;
                break;
            case 'condition':
                bodyHTML = `
                    <div class="node-input-group">
                        <label>条件设置</label>
                        <div class="condition-row">
                            <span style="color: var(--text-secondary);">输入值</span>
                            <select class="node-select" data-field="operator">
                                ${['>', '<', '==', '>=', '<='].map(op => 
                                    `<option value="${op}" ${node.data.operator === op ? 'selected' : ''}>${op === '==' ? '=' : op}</option>`
                                ).join('')}
                            </select>
                            <input type="number" class="node-input" data-field="compareValue" value="${node.data.compareValue}" style="width: 80px;">
                        </div>
                    </div>`;
                break;
            case 'output':
                bodyHTML = `
                    <div class="node-input-group">
                        <label>输出结果</label>
                        <div class="output-display ${node.data.result ? '' : 'empty'}">${node.data.result || '等待运行...'}</div>
                    </div>`;
                break;
        }

        const hasInput = node.type !== 'number-input' && node.type !== 'text-input' || true;
        const hasOutput = node.type !== 'output';

        return `
            <div class="node-header ${config.class}">
                <div class="node-title">
                    <div class="node-title-icon ${config.class}">${config.icon}</div>
                    <span>${config.name}</span>
                </div>
                <button class="node-delete" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="node-body">${bodyHTML}</div>
            <div class="node-ports">
                <div class="port input-port" data-port="input"></div>
                ${hasOutput ? '<div class="port output-port" data-port="output"></div>' : '<div></div>'}
            </div>`;
    }

    bindNodeEvents(element, node) {
        // 拖拽
        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('.port, .node-delete') || 
                ['INPUT', 'SELECT'].includes(e.target.tagName)) return;
            
            this.selectNode(node.id);
            eventBus.emit('node:dragstart', { nodeId: node.id, element, event: e });
        });

        // 删除
        element.querySelector('.node-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNode(node.id);
        });

        // 输入变化
        element.querySelectorAll('.node-input, .node-select').forEach(input => {
            input.addEventListener('change', (e) => {
                const field = e.target.dataset.field;
                node.data[field] = e.target.type === 'number' 
                    ? (parseFloat(e.target.value) || 0) 
                    : e.target.value;
            });
            input.addEventListener('mousedown', (e) => e.stopPropagation());
        });

        // 端口连线
        element.querySelectorAll('.port').forEach(port => {
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                eventBus.emit('connection:start', { 
                    nodeId: node.id, 
                    portType: port.dataset.port, 
                    event: e 
                });
            });
        });

        // 选中
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.port')) {
                this.selectNode(node.id);
            }
        });
    }

    selectNode(nodeId) {
        this.deselectAll();
        this.selectedNode = nodeId;
        document.getElementById(nodeId)?.classList.add('selected');
    }

    deselectAll() {
        this.selectedNode = null;
        document.querySelectorAll('.workflow-node.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    deleteNode(nodeId) {
        this.nodes.delete(nodeId);
        document.getElementById(nodeId)?.remove();
        
        if (this.selectedNode === nodeId) {
            this.selectedNode = null;
        }
        
        this.updateEmptyState();
        eventBus.emit('node:deleted', { nodeId });
        eventBus.emit('toast', { message: '组件已删除', type: 'info' });
        Logger.info('Node deleted', { nodeId });
    }

    updateNodePosition(nodeId, x, y) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.x = x;
            node.y = y;
        }
    }

    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = this.nodes.size === 0 ? 'block' : 'none';
        }
    }

    getNodes() {
        return this.nodes;
    }

    setNodes(nodesArray, counter) {
        this.nodes = new Map(nodesArray);
        this.nodeIdCounter = counter || 0;
        
        this.canvas.querySelectorAll('.workflow-node').forEach(el => el.remove());
        this.nodes.forEach(node => this.renderNode(node));
        this.updateEmptyState();
    }

    clear() {
        this.nodes.clear();
        this.nodeIdCounter = 0;
        this.selectedNode = null;
        this.canvas.querySelectorAll('.workflow-node').forEach(el => el.remove());
        this.updateEmptyState();
    }

    getSelectedNode() {
        return this.selectedNode;
    }
}

export default NodeManager;
