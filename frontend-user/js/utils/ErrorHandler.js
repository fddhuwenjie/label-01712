/**
 * 错误处理器 - 统一错误边界处理
 */
import Logger from './Logger.js';
import eventBus from './EventEmitter.js';

class ErrorHandler {
    constructor() {
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.handle(error || new Error(message), {
                source,
                lineno,
                colno
            });
            return true;
        };

        window.onunhandledrejection = (event) => {
            this.handle(event.reason, { type: 'unhandledrejection' });
        };
    }

    handle(error, context = {}) {
        const errorInfo = {
            message: error?.message || String(error),
            stack: error?.stack,
            context,
            timestamp: new Date().toISOString()
        };

        Logger.error(errorInfo.message, errorInfo);
        eventBus.emit('error', errorInfo);

        return errorInfo;
    }

    wrap(fn, context = {}) {
        return (...args) => {
            try {
                const result = fn(...args);
                if (result instanceof Promise) {
                    return result.catch(error => {
                        this.handle(error, context);
                        throw error;
                    });
                }
                return result;
            } catch (error) {
                this.handle(error, context);
                throw error;
            }
        };
    }

    async tryAsync(fn, fallback = null) {
        try {
            return await fn();
        } catch (error) {
            this.handle(error);
            return fallback;
        }
    }
}

export default new ErrorHandler();
