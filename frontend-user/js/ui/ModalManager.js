/**
 * 模态框管理器 - 统一管理所有弹窗
 */
import Logger from '../utils/Logger.js';

export class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.confirmCallback = null;
        this.bindEvents();
        Logger.debug('ModalManager initialized');
    }

    bindEvents() {
        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });

        // 遮罩点击关闭
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => this.closeAll());
        });

        // 关闭按钮
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAll());
        });

        // 确认弹窗
        document.getElementById('confirmCancel')?.addEventListener('click', () => {
            this.hide('confirmModal');
        });
        
        document.getElementById('confirmOk')?.addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.hide('confirmModal');
        });
    }

    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.activeModals.add(modalId);
            Logger.debug('Modal opened', { modalId });
        }
    }

    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            this.activeModals.delete(modalId);
            Logger.debug('Modal closed', { modalId });
        }
    }

    closeAll() {
        this.activeModals.forEach(id => this.hide(id));
        this.confirmCallback = null;
    }

    confirm(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.confirmCallback = callback;
        this.show('confirmModal');
    }

    isOpen(modalId) {
        return this.activeModals.has(modalId);
    }
}

export default new ModalManager();
