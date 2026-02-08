/**
 * 工作流编辑器主应用
 * @module WorkflowApp
 */
import Logger from './utils/Logger.js';
import eventBus from './utils/EventEmitter.js';
import ErrorHandler from './utils/ErrorHandler.js';
import { NodeManager } from './core/NodeManager.js';
import { ConnectionManager } from './core/ConnectionManager.js';
import { DragManager } from './core/DragManager.js';
import WorkflowExecutor from './core/WorkflowExecutor.js';
import StorageManager from './core/StorageManager.js';
import ModalManager from './ui/ModalManager.js';
import ToastManager from './ui/ToastManager.js';

class WorkflowApp {
    constructor() {
        Logger.info('WorkflowApp initializing...');
        
        this.canvas = document.getElementById('canvas');
        this.svgLayer = document.getElementById('connectionsLayer');
        
        // 初始化管理器
        this.nodeManager = new NodeManager(this.canvas);
        this.connectionManager = new ConnectionManager(this.canvas, this.svgLayer);
        this.dragManager = new DragManager(this.canvas);
        
        this.setupEventListeners();
        this.bindToolbarEvents();
        
        Logger.info('WorkflowApp initialized');
    }

    setupEventListeners() {
        // Toast 事件
        eventBus.on('toast', ({ message, type }) => {
            ToastManager.show(message, type);
        });

        // 节点创建
        eventBus.on('node:create', ({ type, x, y }) => {
            this.nodeManager.createNode(type, x, y);
        });

        // 节点拖拽
        eventBus.on('node:dragstart', ({ nodeId, element, event }) => {
            this.dragManager.startNodeDrag(nodeId, element, event);
        });

        // 节点移动
        eventBus.on('node:move', ({ nodeId, x, y }) => {
            this.nodeManager.updateNodePosition(nodeId, x, y);
            this.connectionManager.renderConnections();
        });

        // 拖拽结束
        eventBus.on('drag:end', () => {
            this.connectionManager.renderConnections();
        });

        // 连线开始
        eventBus.on('connection:start', ({ nodeId, portType, event }) => {
            this.connectionManager.startConnection(nodeId, portType, event);
        });

        // 节点删除
        eventBus.on('node:deleted', ({ nodeId }) => {
            const connections = this.connectionManager.getConnections()
                .filter(c => c.from !== nodeId && c.to !== nodeId);
            this.connectionManager.setConnections(connections);
        });

        // 错误处理
        eventBus.on('error', (errorInfo) => {
            ToastManager.error(`错误: ${errorInfo.message}`);
        });

        // 工作区点击取消选中
        this.canvas.parentElement.addEventListener('click', (e) => {
            if (e.target === this.canvas || e.target.classList.contains('canvas-grid')) {
                this.nodeManager.deselectAll();
            }
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && 
                document.activeElement.tagName !== 'INPUT') {
                const selected = this.nodeManager.getSelectedNode();
                if (selected) {
                    this.nodeManager.deleteNode(selected);
                }
            }
            if (e.key === 'Escape') {
                this.connectionManager.cancelConnection();
            }
        });
    }

    bindToolbarEvents() {
        // 新建
        document.getElementById('newWorkflow')?.addEventListener('click', () => {
            this.newWorkflow();
        });

        // 加载
        document.getElementById('loadWorkflow')?.addEventListener('click', () => {
            this.showLoadModal();
        });

        // 保存
        document.getElementById('saveWorkflow')?.addEventListener('click', () => {
            this.showSaveModal();
        });

        // 运行
        document.getElementById('runWorkflow')?.addEventListener('click', () => {
            this.runWorkflow();
        });

        // 数据管理
        document.getElementById('dataManager')?.addEventListener('click', () => {
            this.showDataModal();
        });

        // 保存确认
        document.getElementById('confirmSaveBtn')?.addEventListener('click', () => {
            this.confirmSave();
        });

        document.getElementById('workflowNameInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmSave();
        });

        // 数据管理操作
        document.getElementById('exportData')?.addEventListener('click', () => this.exportData());
        document.getElementById('importData')?.addEventListener('click', () => this.importData());
        document.getElementById('clearAllData')?.addEventListener('click', () => this.clearAllData());
        document.getElementById('importFileInput')?.addEventListener('change', (e) => this.handleImportFile(e));

        // 数据标签切换
        document.querySelectorAll('.data-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchDataTab(tab.dataset.tab));
        });
    }

    newWorkflow() {
        if (this.nodeManager.getNodes().size > 0) {
            ModalManager.confirm('新建工作流', '确定要新建吗？当前未保存的更改将丢失。', () => {
                this.clearWorkflow();
            });
        } else {
            this.clearWorkflow();
        }
    }

    clearWorkflow() {
        this.nodeManager.clear();
        this.connectionManager.clear();
        ToastManager.success('已创建新工作流');
    }

    showSaveModal() {
        if (this.nodeManager.getNodes().size === 0) {
            ToastManager.error('工作流为空，无法保存');
            return;
        }
        document.getElementById('workflowNameInput').value = `工作流_${new Date().toLocaleDateString()}`;
        ModalManager.show('saveModal');
        setTimeout(() => document.getElementById('workflowNameInput').focus(), 100);
    }

    confirmSave() {
        const name = document.getElementById('workflowNameInput').value.trim();
        if (!name) {
            ToastManager.error('请输入工作流名称');
            return;
        }

        try {
            StorageManager.saveWorkflow({
                name,
                nodes: Array.from(this.nodeManager.getNodes().entries()),
                connections: this.connectionManager.getConnections(),
                nodeIdCounter: this.nodeManager.nodeIdCounter
            });
            ModalManager.hide('saveModal');
            ToastManager.success(`工作流 "${name}" 已保存`);
        } catch (error) {
            ToastManager.error('保存失败: ' + error.message);
        }
    }

    showLoadModal() {
        const workflows = StorageManager.getWorkflows();
        const list = document.getElementById('workflowList');

        if (workflows.length === 0) {
            list.innerHTML = '<p class="no-workflows">暂无保存的工作流</p>';
        } else {
            list.innerHTML = workflows.map((wf, i) => `
                <div class="workflow-item">
                    <div class="workflow-item-info">
                        <h4>${wf.name}</h4>
                        <p>创建于 ${new Date(wf.createdAt).toLocaleString()}</p>
                    </div>
                    <div class="workflow-item-actions">
                        <button class="btn btn-primary btn-load" data-index="${i}">加载</button>
                        <button class="btn btn-secondary btn-delete-wf" data-index="${i}">删除</button>
                    </div>
                </div>
            `).join('');

            list.querySelectorAll('.btn-load').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.loadWorkflow(parseInt(btn.dataset.index));
                    ModalManager.hide('loadModal');
                });
            });

            list.querySelectorAll('.btn-delete-wf').forEach(btn => {
                btn.addEventListener('click', () => {
                    ModalManager.confirm('删除工作流', '确定要删除吗？', () => {
                        StorageManager.deleteWorkflow(parseInt(btn.dataset.index));
                        this.showLoadModal();
                        ToastManager.info('工作流已删除');
                    });
                });
            });
        }

        ModalManager.show('loadModal');
    }

    loadWorkflow(index) {
        const workflow = StorageManager.getWorkflow(index);
        if (!workflow) {
            ToastManager.error('工作流不存在');
            return;
        }

        this.nodeManager.setNodes(workflow.nodes, workflow.nodeIdCounter);
        this.connectionManager.setConnections(workflow.connections);
        
        setTimeout(() => this.connectionManager.renderConnections(), 50);
        ToastManager.success(`已加载 "${workflow.name}"`);
    }

    runWorkflow() {
        const nodes = this.nodeManager.getNodes();
        if (nodes.size === 0) {
            ToastManager.error('工作流为空，无法运行');
            return;
        }

        try {
            const results = WorkflowExecutor.execute(
                nodes, 
                this.connectionManager.getConnections()
            );
            this.showResultModal(results);
        } catch (error) {
            ToastManager.error(`运行错误: ${error.message}`);
        }
    }

    showResultModal(results) {
        const content = document.getElementById('resultContent');
        
        if (results.length === 0) {
            content.innerHTML = '<p class="info">工作流执行完成，但没有输出结果。</p>';
        } else {
            content.innerHTML = `
                <div class="result-summary">
                    <span class="result-badge">✓ 执行成功</span>
                    <span class="result-count">${results.length} 个节点</span>
                </div>
                <div class="result-list">
                    ${results.map(r => `
                        <div class="result-item ${r.type}">
                            <span class="result-desc">${r.description}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        ModalManager.show('resultModal');
    }

    showDataModal() {
        this.currentDataTab = 'workflows';
        this.renderDataContent();
        ModalManager.show('dataModal');
    }

    switchDataTab(tab) {
        this.currentDataTab = tab;
        document.querySelectorAll('.data-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        this.renderDataContent();
    }

    renderDataContent() {
        const content = document.getElementById('dataContent');
        const workflows = StorageManager.getWorkflows();
        const info = StorageManager.getStorageInfo();

        if (this.currentDataTab === 'workflows') {
            if (workflows.length === 0) {
                content.innerHTML = `
                    <div class="empty-data">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <h4>暂无保存的工作流</h4>
                        <p>创建并保存工作流后，数据将显示在这里</p>
                    </div>`;
            } else {
                content.innerHTML = workflows.map((wf, i) => `
                    <div class="workflow-card">
                        <div class="workflow-card-info">
                            <h4>${wf.name}</h4>
                            <p>创建于 ${new Date(wf.createdAt).toLocaleString()}</p>
                            <div class="workflow-card-meta">
                                <span>📦 ${wf.nodes.length} 个节点</span>
                                <span>🔗 ${wf.connections.length} 条连线</span>
                            </div>
                        </div>
                        <div class="workflow-card-actions">
                            <button class="btn btn-primary" onclick="app.loadWorkflowFromData(${i})">加载</button>
                            <button class="btn btn-secondary" onclick="app.deleteWorkflowFromData(${i})">删除</button>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            content.innerHTML = `
                <div class="storage-info">
                    <p>📊 存储统计: ${info.count} 个工作流, ${info.sizeKB} KB</p>
                </div>
                <div class="raw-data">${JSON.stringify({ workflows, ...info }, null, 2)}</div>
            `;
        }
    }

    loadWorkflowFromData(index) {
        this.loadWorkflow(index);
        ModalManager.hide('dataModal');
    }

    deleteWorkflowFromData(index) {
        ModalManager.confirm('删除工作流', '确定要删除吗？', () => {
            StorageManager.deleteWorkflow(index);
            this.renderDataContent();
            ToastManager.info('工作流已删除');
        });
    }

    exportData() {
        const data = StorageManager.exportData();
        if (JSON.parse(data).length === 0) {
            ToastManager.error('没有数据可导出');
            return;
        }

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflows_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        ToastManager.success('数据已导出');
    }

    importData() {
        document.getElementById('importFileInput').click();
    }

    handleImportFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const count = StorageManager.importData(event.target.result);
                this.renderDataContent();
                ToastManager.success(`成功导入 ${count} 个工作流`);
            } catch (err) {
                ToastManager.error('导入失败: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    clearAllData() {
        ModalManager.confirm('⚠️ 警告', '确定要清空所有数据吗？此操作不可恢复！', () => {
            StorageManager.clearAll();
            this.renderDataContent();
            ToastManager.info('所有数据已清空');
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WorkflowApp();
});

export default WorkflowApp;
