/**
 * 连线管理器 - 处理节点间的连接
 */
import Logger from '../utils/Logger.js';
import eventBus from '../utils/EventEmitter.js';

export class ConnectionManager {
    constructor(canvas, svgLayer) {
        this.canvas = canvas;
        this.svgLayer = svgLayer;
        this.connections = [];
        this.isConnecting = false;
        this.startPort = null;
        this.tempConnection = null;

        this.bindEvents();
        Logger.debug('ConnectionManager initialized');
    }

    bindEvents() {
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    startConnection(nodeId, portType, e) {
        if (portType !== 'output') return;

        this.isConnecting = true;
        this.startPort = { nodeId, portType };
        document.body.classList.add('connecting');

        const element = document.getElementById(nodeId);
        const port = element?.querySelector('.output-port');
        if (!port) return;

        const rect = port.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();

        this.tempConnection = {
            startX: rect.left - canvasRect.left + 7,
            startY: rect.top - canvasRect.top + 7,
            endX: e.clientX - canvasRect.left,
            endY: e.clientY - canvasRect.top
        };

        this.renderTempConnection();
        Logger.debug('Connection started', { nodeId });
    }

    onMouseMove(e) {
        if (!this.isConnecting || !this.tempConnection) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        this.tempConnection.endX = e.clientX - canvasRect.left;
        this.tempConnection.endY = e.clientY - canvasRect.top;
        this.renderTempConnection();
    }

    onMouseUp(e) {
        if (!this.isConnecting) return;

        const targetPort = e.target.closest('.input-port');
        if (targetPort) {
            const targetNode = e.target.closest('.workflow-node');
            if (targetNode && targetNode.id !== this.startPort.nodeId) {
                this.createConnection(this.startPort.nodeId, targetNode.id);
            }
        }
        this.cancelConnection();
    }

    createConnection(fromId, toId) {
        // 检查重复
        if (this.connections.some(c => c.from === fromId && c.to === toId)) {
            eventBus.emit('toast', { message: '连接已存在', type: 'error' });
            return false;
        }

        // 检查循环
        if (this.wouldCreateCycle(fromId, toId)) {
            eventBus.emit('toast', { message: '不能形成循环连接', type: 'error' });
            return false;
        }

        this.connections.push({ from: fromId, to: toId });
        this.renderConnections();
        eventBus.emit('toast', { message: '连接已建立', type: 'success' });
        Logger.info('Connection created', { from: fromId, to: toId });
        return true;
    }

    deleteConnection(index) {
        if (index >= 0 && index < this.connections.length) {
            const conn = this.connections[index];
            this.connections.splice(index, 1);
            this.renderConnections();
            eventBus.emit('toast', { message: '连接已删除', type: 'info' });
            Logger.info('Connection deleted', conn);
        }
    }

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

    cancelConnection() {
        this.isConnecting = false;
        this.startPort = null;
        this.tempConnection = null;
        document.body.classList.remove('connecting');

        const tempLine = this.svgLayer.querySelector('.temp');
        if (tempLine) tempLine.remove();
    }

    renderTempConnection() {
        if (!this.tempConnection) return;

        const { startX, startY, endX, endY } = this.tempConnection;
        const path = this.createPath(startX, startY, endX, endY);

        let tempLine = this.svgLayer.querySelector('.temp');
        if (!tempLine) {
            tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tempLine.classList.add('connection-line', 'temp');
            this.svgLayer.appendChild(tempLine);
        }
        tempLine.setAttribute('d', path);
    }

    renderConnections() {
        this.svgLayer.querySelectorAll('.connection-line:not(.temp)').forEach(el => el.remove());

        const canvasRect = this.canvas.getBoundingClientRect();

        this.connections.forEach((conn, index) => {
            const fromEl = document.getElementById(conn.from);
            const toEl = document.getElementById(conn.to);
            if (!fromEl || !toEl) return;

            const fromPort = fromEl.querySelector('.output-port');
            const toPort = toEl.querySelector('.input-port');
            if (!fromPort || !toPort) return;

            const fromRect = fromPort.getBoundingClientRect();
            const toRect = toPort.getBoundingClientRect();

            const x1 = fromRect.left - canvasRect.left + 7;
            const y1 = fromRect.top - canvasRect.top + 7;
            const x2 = toRect.left - canvasRect.left + 7;
            const y2 = toRect.top - canvasRect.top + 7;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.classList.add('connection-line');
            line.setAttribute('d', this.createPath(x1, y1, x2, y2));
            line.dataset.index = index;

            line.addEventListener('click', () => this.deleteConnection(index));
            this.svgLayer.appendChild(line);
        });

        this.updatePortStates();
    }

    createPath(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const offset = Math.min(dx * 0.5, 100);
        return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
    }

    updatePortStates() {
        document.querySelectorAll('.port').forEach(p => p.classList.remove('connected'));

        this.connections.forEach(conn => {
            document.getElementById(conn.from)?.querySelector('.output-port')?.classList.add('connected');
            document.getElementById(conn.to)?.querySelector('.input-port')?.classList.add('connected');
        });
    }

    getConnections() {
        return [...this.connections];
    }

    setConnections(connections) {
        this.connections = connections || [];
        this.renderConnections();
    }

    getInputsFor(nodeId) {
        return this.connections.filter(c => c.to === nodeId).map(c => c.from);
    }

    clear() {
        this.connections = [];
        this.svgLayer.innerHTML = '';
    }

    isActive() {
        return this.isConnecting;
    }
}

export default ConnectionManager;
