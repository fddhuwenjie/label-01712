/**
 * 拖拽管理器 - 处理组件拖拽和节点移动
 */
import Logger from '../utils/Logger.js';
import eventBus from '../utils/EventEmitter.js';

export class DragManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;
        this.dragTarget = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.bindEvents();
        Logger.debug('DragManager initialized');
    }

    bindEvents() {
        // 组件面板拖拽
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.onComponentDragStart(e));
            item.addEventListener('dragend', (e) => this.onComponentDragEnd(e));
        });

        // 工作区放置
        this.canvas.parentElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.canvas.parentElement.addEventListener('drop', (e) => this.onDrop(e));

        // 全局鼠标事件
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    onComponentDragStart(e) {
        const type = e.currentTarget.dataset.type;
        e.dataTransfer.setData('componentType', type);
        e.currentTarget.style.opacity = '0.5';
        Logger.debug('Component drag started', { type });
    }

    onComponentDragEnd(e) {
        e.currentTarget.style.opacity = '1';
    }

    onDrop(e) {
        e.preventDefault();
        const componentType = e.dataTransfer.getData('componentType');
        if (!componentType) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 100;
        const y = e.clientY - rect.top - 50;

        Logger.info('Component dropped', { type: componentType, x, y });
        eventBus.emit('node:create', { type: componentType, x, y });
    }

    startNodeDrag(nodeId, element, e) {
        this.isDragging = true;
        this.dragTarget = { nodeId, element };
        
        const rect = element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        element.style.zIndex = '100';
        Logger.debug('Node drag started', { nodeId });
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.dragTarget) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        const x = Math.max(0, e.clientX - canvasRect.left - this.dragOffset.x);
        const y = Math.max(0, e.clientY - canvasRect.top - this.dragOffset.y);

        this.dragTarget.element.style.left = `${x}px`;
        this.dragTarget.element.style.top = `${y}px`;

        eventBus.emit('node:move', { 
            nodeId: this.dragTarget.nodeId, 
            x, 
            y 
        });
    }

    onMouseUp(e) {
        if (this.isDragging && this.dragTarget) {
            this.dragTarget.element.style.zIndex = '10';
            Logger.debug('Node drag ended', { nodeId: this.dragTarget.nodeId });
        }
        
        this.isDragging = false;
        this.dragTarget = null;
        eventBus.emit('drag:end');
    }

    isActive() {
        return this.isDragging;
    }
}

export default DragManager;
