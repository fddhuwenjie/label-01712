/**
 * 可视化工作流编辑器
 * Visual Workflow Editor
 */

class WorkflowEditor {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
        this.nodeIdCounter = 0;
        this.selectedNode = null;
        this.isDragging = false;
        this.isConnecting = false;
        this.tempConnection = null;
        this.startPort = null;
        this.dragOffset = { x: 0, y: 0 };
        this.confirmCallback = null;
        
        this.canvas = document.getElementById('canvas');
        this.workspace = document.getElementById('workspace');
        this.connectionsLayer = document.getElementById('connectionsLayer');
        this.emptyState = document.getElementById('emptyState');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadFromStorage();
    }
    
    bindEvents() {
        // 组件拖拽
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.onComponentDragStart(e));
            item.addEventListener('dragend', (e) => this.onComponentDragEnd(e));
        });
        
        // 工作区拖放
        this.workspace.addEventListener('dragover', (e) => this.onWorkspaceDragOver(e));
        this.workspace.addEventListener('drop', (e) => this.onWorkspaceDrop(e));
        
        // 工作区点击取消选中
        this.workspace.addEventListener('click', (e) => {
            if (e.target === this.canvas || e.target.classList.contains('canvas-grid')) {
                this.deselectAll();
            }
        });
        
        // 鼠标移动（用于连线和拖拽）
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // 工具栏按钮
        document.getElementById('newWorkflow').addEventListener('click', () => this.newWorkflow());
        document.getElementById('loadWorkflow').addEventListener('click', () => this.showLoadModal());
        document.getElementById('saveWorkflow').addEventListener('click', () => this.saveWorkflow());
        document.getElementById('runWorkflow').addEventListener('click', () => this.runWorkflow());
        document.getElementById('dataManager').addEventListener('click', () => this.showDataModal());
        
        // 数据管理
        document.getElementById('closeDataModal').addEventListener('click', () => this.hideDataModal());
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('importData').addEventListener('click', () => this.importData());
        document.getElementById('clearAllData').addEventListener('click', () => this.clearAllData());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.handleImportFile(e));
        document.querySelectorAll('.data-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchDataTab(tab.dataset.tab));
        });
        
        // 确认弹窗
        document.getElementById('closeConfirmModal').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('confirmCancel').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('confirmOk').addEventListener('click', () => this.handleConfirmOk());
        
        // 模态框
        document.getElementById('closeLoadModal').addEventListener('click', () => this.hideLoadModal());
        document.getElementById('closeResultModal').addEventListener('click', () => this.hideResultModal());
        document.getElementById('closeSaveModal').addEventListener('click', () => this.hideSaveModal());
        document.getElementById('confirmSaveBtn').addEventListener('click', () => this.confirmSave());
        document.getElementById('workflowNameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmSave();
        });
        
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                this.hideLoadModal();
                this.hideResultModal();
                this.hideSaveModal();
                this.hideDataModal();
                this.hideConfirmModal();
            });
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedNode && document.activeElement.tagName !== 'INPUT') {
                    this.deleteNode(this.selectedNode);
                }
            }
            if (e.key === 'Escape') {
                this.cancelConnection();
                this.hideLoadModal();
                this.hideResultModal();
                this.hideSaveModal();
                this.hideDataModal();
                this.hideConfirmModal();
            }
        });
    }
    
    // 组件拖拽开始
    onComponentDragStart(e) {
        e.dataTransfer.setData('componentType', e.currentTarget.dataset.type);
        e.currentTarget.style.opacity = '0.5';
    }
    
    // 组件拖拽结束
    onComponentDragEnd(e) {
        e.currentTarget.style.opacity = '1';
    }
    
    // 工作区拖拽悬停
    onWorkspaceDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    // 工作区放置
    onWorkspaceDrop(e) {
        e.preventDefault();
        const componentType = e.dataTransfer.getData('componentType');
        if (!componentType) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 100;
        const y = e.clientY - rect.top - 50;
        
        this.createNode(componentType, x, y);
    }
    
    // 创建节点
    createNode(type, x, y) {
        const id = `node_${++this.nodeIdCounter}`;
        const node = {
            id,
            type,
            x: Math.max(0, x),
            y: Math.max(0, y),
            data: this.getDefaultNodeData(type)
        };
        
        this.nodes.set(id, node);
        this.renderNode(node);
        this.updateEmptyState();
        this.showToast('组件已添加', 'success');
        
        return node;
    }
    
    // 获取默认节点数据
    getDefaultNodeData(type) {
        switch (type) {
            case 'number-input':
                return { value: 0 };
            case 'text-input':
                return { value: '' };
            case 'condition':
                return { operator: '>', compareValue: 0 };
            case 'output':
                return { result: '' };
            default:
                return {};
        }
    }
    
    // 渲染节点
    renderNode(node) {
        const element = document.createElement('div');
        element.className = 'workflow-node';
        element.id = node.id;
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;
        
        element.innerHTML = this.getNodeHTML(node);
        
        // 绑定节点事件
        this.bindNodeEvents(element, node);
        
        this.canvas.appendChild(element);
    }
    
    // 获取节点HTML
    getNodeHTML(node) {
        const typeConfig = this.getTypeConfig(node.type);
        
        let bodyHTML = '';
        switch (node.type) {
            case 'number-input':
                bodyHTML = `
                    <div class="node-input-group">
                        <label>数值</label>
                        <input type="number" class="node-input" data-field="value" value="${node.data.value}">
                    </div>
                `;
                break;
            case 'text-input':
                bodyHTML = `
                    <div class="node-input-group">
                        <label>文本内容</label>
                        <input type="text" class="node-input" data-field="value" value="${node.data.value}" placeholder="请输入文本...">
                    </div>
                `;
                break;
            case 'condition':
                bodyHTML = `
                    <div class="node-input-group">
                        <label>条件设置</label>
                        <div class="condition-row">
                            <span style="color: var(--text-secondary);">输入值</span>
                            <select class="node-select" data-field="operator">
                                <option value=">" ${node.data.operator === '>' ? 'selected' : ''}>&gt;</option>
                                <option value="<" ${node.data.operator === '<' ? 'selected' : ''}>&lt;</option>
                                <option value="==" ${node.data.operator === '==' ? 'selected' : ''}>=</option>
                                <option value=">=" ${node.data.operator === '>=' ? 'selected' : ''}>&gt;=</option>
                                <option value="<=" ${node.data.operator === '<=' ? 'selected' : ''}>&lt;=</option>
                            </select>
                            <input type="number" class="node-input" data-field="compareValue" value="${node.data.compareValue}" style="width: 80px;">
                        </div>
                    </div>
                `;
                break;
            case 'output':
                bodyHTML = `
                    <div class="node-input-group">
                        <label>输出结果</label>
                        <div class="output-display ${node.data.result ? '' : 'empty'}">${node.data.result || '等待运行...'}</div>
                    </div>
                `;
                break;
        }
        
        return `
            <div class="node-header ${typeConfig.class}">
                <div class="node-title">
                    <div class="node-title-icon ${typeConfig.class}">
                        ${typeConfig.icon}
                    </div>
                    <span>${typeConfig.name}</span>
                </div>
                <button class="node-delete" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="node-body">
                ${bodyHTML}
            </div>
            <div class="node-ports">
                <div class="port input-port" data-port="input"></div>
                ${node.type !== 'output' ? '<div class="port output-port" data-port="output"></div>' : '<div></div>'}
            </div>
        `;
    }

    
    // 获取类型配置
    getTypeConfig(type) {
        const configs = {
            'number-input': {
                name: '数字输入',
                class: 'number',
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>'
            },
            'text-input': {
                name: '文字输入',
                class: 'text',
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>'
            },
            'condition': {
                name: '条件判断',
                class: 'condition',
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 3l9 9-9 9-9-9 9-9z"/></svg>'
            },
            'output': {
                name: '结果输出',
                class: 'output',
                icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>'
            }
        };
        return configs[type] || configs['number-input'];
    }
    
    // 绑定节点事件
    bindNodeEvents(element, node) {
        // 拖拽节点
        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('.port') || e.target.closest('.node-delete') || 
                e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                return;
            }
            
            this.isDragging = true;
            this.selectedNode = node.id;
            this.selectNode(node.id);
            
            const rect = element.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            element.style.zIndex = '100';
        });
        
        // 删除按钮
        element.querySelector('.node-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNode(node.id);
        });
        
        // 输入变化
        element.querySelectorAll('.node-input, .node-select').forEach(input => {
            input.addEventListener('change', (e) => {
                const field = e.target.dataset.field;
                let value = e.target.value;
                
                if (e.target.type === 'number') {
                    value = parseFloat(value) || 0;
                }
                
                node.data[field] = value;
            });
            
            // 阻止拖拽
            input.addEventListener('mousedown', (e) => e.stopPropagation());
        });
        
        // 端口连线
        element.querySelectorAll('.port').forEach(port => {
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startConnection(node.id, port.dataset.port, e);
            });
        });
        
        // 选中节点
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.port')) {
                this.selectNode(node.id);
            }
        });
    }
    
    // 选中节点
    selectNode(nodeId) {
        this.deselectAll();
        this.selectedNode = nodeId;
        const element = document.getElementById(nodeId);
        if (element) {
            element.classList.add('selected');
        }
    }
    
    // 取消所有选中
    deselectAll() {
        this.selectedNode = null;
        document.querySelectorAll('.workflow-node.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }
    
    // 删除节点
    deleteNode(nodeId) {
        // 删除相关连线
        this.connections = this.connections.filter(conn => {
            if (conn.from === nodeId || conn.to === nodeId) {
                return false;
            }
            return true;
        });
        
        // 删除节点
        this.nodes.delete(nodeId);
        const element = document.getElementById(nodeId);
        if (element) {
            element.remove();
        }
        
        this.selectedNode = null;
        this.renderConnections();
        this.updateEmptyState();
        this.showToast('组件已删除', 'info');
    }
    
    // 开始连线
    startConnection(nodeId, portType, e) {
        if (portType !== 'output') return;
        
        this.isConnecting = true;
        this.startPort = { nodeId, portType };
        document.body.classList.add('connecting');
        
        const element = document.getElementById(nodeId);
        const port = element.querySelector('.output-port');
        const rect = port.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.tempConnection = {
            startX: rect.left - canvasRect.left + 7,
            startY: rect.top - canvasRect.top + 7,
            endX: e.clientX - canvasRect.left,
            endY: e.clientY - canvasRect.top
        };
        
        this.renderTempConnection();
    }
    
    // 渲染临时连线
    renderTempConnection() {
        if (!this.tempConnection) return;
        
        const { startX, startY, endX, endY } = this.tempConnection;
        const path = this.createConnectionPath(startX, startY, endX, endY);
        
        let tempLine = this.connectionsLayer.querySelector('.temp');
        if (!tempLine) {
            tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tempLine.classList.add('connection-line', 'temp');
            this.connectionsLayer.appendChild(tempLine);
        }
        
        tempLine.setAttribute('d', path);
    }
    
    // 创建连线路径（贝塞尔曲线）
    createConnectionPath(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const controlOffset = Math.min(dx * 0.5, 100);
        
        return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
    }
    
    // 鼠标移动
    onMouseMove(e) {
        // 拖拽节点
        if (this.isDragging && this.selectedNode) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const x = e.clientX - canvasRect.left - this.dragOffset.x;
            const y = e.clientY - canvasRect.top - this.dragOffset.y;
            
            const node = this.nodes.get(this.selectedNode);
            if (node) {
                node.x = Math.max(0, x);
                node.y = Math.max(0, y);
                
                const element = document.getElementById(this.selectedNode);
                element.style.left = `${node.x}px`;
                element.style.top = `${node.y}px`;
                
                this.renderConnections();
            }
        }
        
        // 连线
        if (this.isConnecting && this.tempConnection) {
            const canvasRect = this.canvas.getBoundingClientRect();
            this.tempConnection.endX = e.clientX - canvasRect.left;
            this.tempConnection.endY = e.clientY - canvasRect.top;
            this.renderTempConnection();
        }
    }
    
    // 鼠标释放
    onMouseUp(e) {
        // 结束拖拽
        if (this.isDragging) {
            this.isDragging = false;
            if (this.selectedNode) {
                const element = document.getElementById(this.selectedNode);
                if (element) {
                    element.style.zIndex = '10';
                }
            }
        }
        
        // 结束连线
        if (this.isConnecting) {
            const targetPort = e.target.closest('.input-port');
            if (targetPort) {
                const targetNode = e.target.closest('.workflow-node');
                if (targetNode && targetNode.id !== this.startPort.nodeId) {
                    this.createConnection(this.startPort.nodeId, targetNode.id);
                }
            }
            this.cancelConnection();
        }
    }
    
    // 取消连线
    cancelConnection() {
        this.isConnecting = false;
        this.startPort = null;
        this.tempConnection = null;
        document.body.classList.remove('connecting');
        
        const tempLine = this.connectionsLayer.querySelector('.temp');
        if (tempLine) {
            tempLine.remove();
        }
    }
    
    // 创建连接
    createConnection(fromId, toId) {
        // 检查是否已存在
        const exists = this.connections.some(c => c.from === fromId && c.to === toId);
        if (exists) {
            this.showToast('连接已存在', 'error');
            return;
        }
        
        // 检查是否会形成循环
        if (this.wouldCreateCycle(fromId, toId)) {
            this.showToast('不能形成循环连接', 'error');
            return;
        }
        
        this.connections.push({ from: fromId, to: toId });
        this.renderConnections();
        this.showToast('连接已建立', 'success');
    }
    
    // 检查是否会形成循环
    wouldCreateCycle(fromId, toId) {
        const visited = new Set();
        const stack = [fromId];
        
        while (stack.length > 0) {
            const current = stack.pop();
            if (current === toId) continue;
            if (visited.has(current)) continue;
            visited.add(current);
            
            this.connections
                .filter(c => c.to === current)
                .forEach(c => stack.push(c.from));
        }
        
        return visited.has(toId);
    }
    
    // 渲染所有连线
    renderConnections() {
        // 清除现有连线（保留临时连线）
        this.connectionsLayer.querySelectorAll('.connection-line:not(.temp)').forEach(el => el.remove());
        
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.connections.forEach((conn, index) => {
            const fromElement = document.getElementById(conn.from);
            const toElement = document.getElementById(conn.to);
            
            if (!fromElement || !toElement) return;
            
            const fromPort = fromElement.querySelector('.output-port');
            const toPort = toElement.querySelector('.input-port');
            
            if (!fromPort || !toPort) return;
            
            const fromRect = fromPort.getBoundingClientRect();
            const toRect = toPort.getBoundingClientRect();
            
            const x1 = fromRect.left - canvasRect.left + 7;
            const y1 = fromRect.top - canvasRect.top + 7;
            const x2 = toRect.left - canvasRect.left + 7;
            const y2 = toRect.top - canvasRect.top + 7;
            
            const path = this.createConnectionPath(x1, y1, x2, y2);
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.classList.add('connection-line');
            line.setAttribute('d', path);
            line.dataset.index = index;
            
            // 点击删除连线
            line.addEventListener('click', () => {
                this.connections.splice(index, 1);
                this.renderConnections();
                this.showToast('连接已删除', 'info');
            });
            
            this.connectionsLayer.appendChild(line);
        });
        
        // 更新端口状态
        this.updatePortStates();
    }
    
    // 更新端口状态
    updatePortStates() {
        document.querySelectorAll('.port').forEach(port => {
            port.classList.remove('connected');
        });
        
        this.connections.forEach(conn => {
            const fromElement = document.getElementById(conn.from);
            const toElement = document.getElementById(conn.to);
            
            if (fromElement) {
                const port = fromElement.querySelector('.output-port');
                if (port) port.classList.add('connected');
            }
            
            if (toElement) {
                const port = toElement.querySelector('.input-port');
                if (port) port.classList.add('connected');
            }
        });
    }

    
    // 更新空状态显示
    updateEmptyState() {
        if (this.nodes.size === 0) {
            this.emptyState.style.display = 'block';
        } else {
            this.emptyState.style.display = 'none';
        }
    }
    
    // 新建工作流
    newWorkflow() {
        if (this.nodes.size > 0) {
            this.showConfirm('新建工作流', '确定要新建工作流吗？当前未保存的更改将丢失。', () => {
                this.clearCanvas();
            });
        } else {
            this.clearCanvas();
        }
    }
    
    // 清空画布
    clearCanvas() {
        this.nodes.clear();
        this.connections = [];
        this.nodeIdCounter = 0;
        this.selectedNode = null;
        
        this.canvas.querySelectorAll('.workflow-node').forEach(el => el.remove());
        this.connectionsLayer.innerHTML = '';
        
        this.updateEmptyState();
        this.showToast('已创建新工作流', 'success');
    }
    
    // 保存工作流
    saveWorkflow() {
        if (this.nodes.size === 0) {
            this.showToast('工作流为空，无法保存', 'error');
            return;
        }
        
        this.showSaveModal();
    }
    
    // 显示保存模态框
    showSaveModal() {
        const modal = document.getElementById('saveModal');
        const input = document.getElementById('workflowNameInput');
        input.value = `工作流_${new Date().toLocaleDateString()}`;
        modal.classList.add('active');
        setTimeout(() => input.focus(), 100);
    }
    
    // 隐藏保存模态框
    hideSaveModal() {
        document.getElementById('saveModal').classList.remove('active');
    }
    
    // 确认保存
    confirmSave() {
        const input = document.getElementById('workflowNameInput');
        const name = input.value.trim();
        
        if (!name) {
            this.showToast('请输入工作流名称', 'error');
            return;
        }
        
        const workflow = {
            id: Date.now(),
            name,
            createdAt: new Date().toISOString(),
            nodes: Array.from(this.nodes.entries()),
            connections: this.connections,
            nodeIdCounter: this.nodeIdCounter
        };
        
        const saved = JSON.parse(localStorage.getItem('workflows') || '[]');
        saved.push(workflow);
        localStorage.setItem('workflows', JSON.stringify(saved));
        
        this.hideSaveModal();
        this.showToast(`工作流 "${name}" 已保存`, 'success');
    }
    
    // 显示加载模态框
    showLoadModal() {
        const modal = document.getElementById('loadModal');
        const list = document.getElementById('workflowList');
        
        const saved = JSON.parse(localStorage.getItem('workflows') || '[]');
        
        if (saved.length === 0) {
            list.innerHTML = '<p class="no-workflows">暂无保存的工作流</p>';
        } else {
            list.innerHTML = saved.map((wf, index) => `
                <div class="workflow-item" data-index="${index}">
                    <div class="workflow-item-info">
                        <h4>${wf.name}</h4>
                        <p>创建于 ${new Date(wf.createdAt).toLocaleString()}</p>
                    </div>
                    <div class="workflow-item-actions">
                        <button class="btn btn-primary btn-load" data-index="${index}">加载</button>
                        <button class="btn btn-secondary btn-delete-wf" data-index="${index}">删除</button>
                    </div>
                </div>
            `).join('');
            
            // 绑定加载按钮
            list.querySelectorAll('.btn-load').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadWorkflow(parseInt(btn.dataset.index));
                    this.hideLoadModal();
                });
            });
            
            // 绑定删除按钮
            list.querySelectorAll('.btn-delete-wf').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteWorkflow(parseInt(btn.dataset.index));
                });
            });
        }
        
        modal.classList.add('active');
    }
    
    // 隐藏加载模态框
    hideLoadModal() {
        document.getElementById('loadModal').classList.remove('active');
    }
    
    // 加载工作流
    loadWorkflow(index) {
        const saved = JSON.parse(localStorage.getItem('workflows') || '[]');
        const workflow = saved[index];
        
        if (!workflow) {
            this.showToast('工作流不存在', 'error');
            return;
        }
        
        // 清除当前
        this.canvas.querySelectorAll('.workflow-node').forEach(el => el.remove());
        this.connectionsLayer.innerHTML = '';
        
        // 恢复数据
        this.nodes = new Map(workflow.nodes);
        this.connections = workflow.connections;
        this.nodeIdCounter = workflow.nodeIdCounter;
        
        // 渲染节点
        this.nodes.forEach(node => this.renderNode(node));
        
        // 渲染连线
        setTimeout(() => this.renderConnections(), 50);
        
        this.updateEmptyState();
        this.showToast(`已加载 "${workflow.name}"`, 'success');
    }
    
    // 删除保存的工作流
    deleteWorkflow(index) {
        this.showConfirm('删除工作流', '确定要删除这个工作流吗？', () => {
            const saved = JSON.parse(localStorage.getItem('workflows') || '[]');
            saved.splice(index, 1);
            localStorage.setItem('workflows', JSON.stringify(saved));
            
            this.showLoadModal();
            this.showToast('工作流已删除', 'info');
        });
    }
    
    // 从本地存储加载
    loadFromStorage() {
        // 可以在这里实现自动加载上次的工作流
    }
    
    // 运行工作流
    runWorkflow() {
        if (this.nodes.size === 0) {
            this.showToast('工作流为空，无法运行', 'error');
            return;
        }
        
        try {
            const result = this.executeWorkflow();
            this.showResultModal(result);
        } catch (error) {
            this.showToast(`运行错误: ${error.message}`, 'error');
        }
    }
    
    // 执行工作流
    executeWorkflow() {
        const results = [];
        const nodeValues = new Map();
        
        // 拓扑排序
        const sorted = this.topologicalSort();
        
        if (sorted.length === 0 && this.nodes.size > 0) {
            throw new Error('工作流存在循环依赖');
        }
        
        // 按顺序执行
        sorted.forEach(nodeId => {
            const node = this.nodes.get(nodeId);
            if (!node) return;
            
            let value;
            
            switch (node.type) {
                case 'number-input':
                    // 获取输入值，如果有连接则使用连接的值
                    const numInputs = this.getInputValues(nodeId, nodeValues);
                    if (numInputs.length > 0) {
                        // 尝试将输入转换为数字
                        const parsed = parseFloat(numInputs[0]);
                        value = isNaN(parsed) ? parseFloat(node.data.value) || 0 : parsed;
                    } else {
                        value = parseFloat(node.data.value) || 0;
                    }
                    results.push(`📥 数字输入: ${value}`);
                    break;
                    
                case 'text-input':
                    // 获取输入值，如果有连接则拼接
                    const textInputs = this.getInputValues(nodeId, nodeValues);
                    if (textInputs.length > 0) {
                        value = textInputs.map(v => String(v)).join('') + (node.data.value || '');
                    } else {
                        value = node.data.value || '';
                    }
                    results.push(`📝 文字输入: "${value}"`);
                    break;
                    
                case 'condition':
                    // 获取输入值
                    const inputs = this.getInputValues(nodeId, nodeValues);
                    const inputValue = inputs.length > 0 ? inputs[0] : 0;
                    const compareValue = parseFloat(node.data.compareValue) || 0;
                    const operator = node.data.operator;
                    
                    let conditionResult;
                    switch (operator) {
                        case '>': conditionResult = inputValue > compareValue; break;
                        case '<': conditionResult = inputValue < compareValue; break;
                        case '==': conditionResult = inputValue == compareValue; break;
                        case '>=': conditionResult = inputValue >= compareValue; break;
                        case '<=': conditionResult = inputValue <= compareValue; break;
                        default: conditionResult = false;
                    }
                    
                    value = conditionResult;
                    results.push(`🔀 条件判断: ${inputValue} ${operator} ${compareValue} = ${conditionResult ? '✅ 真' : '❌ 假'}`);
                    break;
                    
                case 'output':
                    const outputInputs = this.getInputValues(nodeId, nodeValues);
                    value = outputInputs.length > 0 ? outputInputs.join(', ') : '无输入';
                    
                    // 更新输出节点显示
                    const element = document.getElementById(nodeId);
                    if (element) {
                        const display = element.querySelector('.output-display');
                        if (display) {
                            display.textContent = String(value);
                            display.classList.remove('empty');
                        }
                    }
                    
                    node.data.result = String(value);
                    results.push(`📤 输出结果: ${value}`);
                    break;
            }
            
            nodeValues.set(nodeId, value);
        });
        
        return results;
    }
    
    // 获取节点的输入值
    getInputValues(nodeId, nodeValues) {
        const inputs = [];
        this.connections
            .filter(c => c.to === nodeId)
            .forEach(c => {
                if (nodeValues.has(c.from)) {
                    inputs.push(nodeValues.get(c.from));
                }
            });
        return inputs;
    }
    
    // 拓扑排序
    topologicalSort() {
        const inDegree = new Map();
        const result = [];
        const queue = [];
        
        // 初始化入度
        this.nodes.forEach((_, id) => inDegree.set(id, 0));
        
        // 计算入度
        this.connections.forEach(conn => {
            inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
        });
        
        // 找出入度为0的节点
        inDegree.forEach((degree, id) => {
            if (degree === 0) queue.push(id);
        });
        
        // BFS
        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);
            
            this.connections
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
    
    // 显示结果模态框
    showResultModal(results) {
        const modal = document.getElementById('resultModal');
        const content = document.getElementById('resultContent');
        
        if (results.length === 0) {
            content.innerHTML = '<p class="info">工作流执行完成，但没有输出结果。</p>';
        } else {
            content.innerHTML = results.map(r => `<p class="success">${r}</p>`).join('');
        }
        
        modal.classList.add('active');
    }
    
    // 隐藏结果模态框
    hideResultModal() {
        document.getElementById('resultModal').classList.remove('active');
    }
    
    // 显示Toast通知
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
            error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        
        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // 显示数据管理模态框
    showDataModal() {
        const modal = document.getElementById('dataModal');
        this.currentDataTab = 'workflows';
        this.renderDataContent();
        modal.classList.add('active');
    }
    
    // 隐藏数据管理模态框
    hideDataModal() {
        document.getElementById('dataModal').classList.remove('active');
    }
    
    // 切换数据标签
    switchDataTab(tab) {
        this.currentDataTab = tab;
        document.querySelectorAll('.data-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        this.renderDataContent();
    }
    
    // 渲染数据内容
    renderDataContent() {
        const content = document.getElementById('dataContent');
        const saved = JSON.parse(localStorage.getItem('workflows') || '[]');
        
        if (this.currentDataTab === 'workflows') {
            if (saved.length === 0) {
                content.innerHTML = `
                    <div class="empty-data">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <h4>暂无保存的工作流</h4>
                        <p>创建并保存工作流后，数据将显示在这里</p>
                    </div>
                `;
            } else {
                content.innerHTML = saved.map((wf, index) => `
                    <div class="workflow-card">
                        <div class="workflow-card-info">
                            <h4>${wf.name}</h4>
                            <p>创建于 ${new Date(wf.createdAt).toLocaleString()}</p>
                            <div class="workflow-card-meta">
                                <span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                                    </svg>
                                    ${wf.nodes.length} 个节点
                                </span>
                                <span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                        <polyline points="15,3 21,3 21,9"/>
                                        <line x1="10" y1="14" x2="21" y2="3"/>
                                    </svg>
                                    ${wf.connections.length} 条连线
                                </span>
                            </div>
                        </div>
                        <div class="workflow-card-actions">
                            <button class="btn btn-primary" onclick="workflowEditor.loadWorkflowFromData(${index})">加载</button>
                            <button class="btn btn-secondary" onclick="workflowEditor.deleteWorkflowFromData(${index})">删除</button>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            // 原始数据视图
            const data = {
                workflows: saved,
                totalWorkflows: saved.length,
                storageUsed: new Blob([JSON.stringify(saved)]).size
            };
            content.innerHTML = `
                <div class="raw-data">${JSON.stringify(data, null, 2)}</div>
            `;
        }
    }
    
    // 从数据管理加载工作流
    loadWorkflowFromData(index) {
        this.loadWorkflow(index);
        this.hideDataModal();
    }
    
    // 从数据管理删除工作流
    deleteWorkflowFromData(index) {
        this.showConfirm('删除工作流', '确定要删除这个工作流吗？', () => {
            const saved = JSON.parse(localStorage.getItem('workflows') || '[]');
            saved.splice(index, 1);
            localStorage.setItem('workflows', JSON.stringify(saved));
            
            this.renderDataContent();
            this.showToast('工作流已删除', 'info');
        });
    }
    
    // 导出数据
    exportData() {
        const saved = JSON.parse(localStorage.getItem('workflows') || '[]');
        if (saved.length === 0) {
            this.showToast('没有数据可导出', 'error');
            return;
        }
        
        const dataStr = JSON.stringify(saved, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflows_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('数据已导出', 'success');
    }
    
    // 导入数据
    importData() {
        document.getElementById('importFileInput').click();
    }
    
    // 处理导入文件
    handleImportFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!Array.isArray(data)) {
                    throw new Error('无效的数据格式');
                }
                
                const existing = JSON.parse(localStorage.getItem('workflows') || '[]');
                const merged = [...existing, ...data];
                localStorage.setItem('workflows', JSON.stringify(merged));
                
                this.renderDataContent();
                this.showToast(`成功导入 ${data.length} 个工作流`, 'success');
            } catch (err) {
                this.showToast('导入失败: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
    
    // 清空所有数据
    clearAllData() {
        this.showConfirm('⚠️ 警告', '确定要清空所有保存的工作流吗？此操作不可恢复！', () => {
            localStorage.removeItem('workflows');
            this.renderDataContent();
            this.showToast('所有数据已清空', 'info');
        });
    }
    
    // 显示确认弹窗
    showConfirm(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.confirmCallback = callback;
        document.getElementById('confirmModal').classList.add('active');
    }
    
    // 隐藏确认弹窗
    hideConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
        this.confirmCallback = null;
    }
    
    // 处理确认
    handleConfirmOk() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
        this.hideConfirmModal();
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.workflowEditor = new WorkflowEditor();
});
