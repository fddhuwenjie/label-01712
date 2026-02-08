/**
 * 日志管理器 - 统一日志输出
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

class Logger {
    constructor() {
        this.level = LOG_LEVELS.DEBUG;
        this.logs = [];
        this.maxLogs = 100;
    }

    setLevel(level) {
        this.level = LOG_LEVELS[level] ?? LOG_LEVELS.DEBUG;
    }

    _log(level, message, data = null) {
        if (LOG_LEVELS[level] < this.level) return;

        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };

        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        const style = {
            DEBUG: 'color: #888',
            INFO: 'color: #3b82f6',
            WARN: 'color: #f59e0b',
            ERROR: 'color: #ef4444; font-weight: bold'
        };

        console.log(
            `%c[${level}] ${entry.timestamp.slice(11, 19)} - ${message}`,
            style[level],
            data ?? ''
        );

        return entry;
    }

    debug(message, data) { return this._log('DEBUG', message, data); }
    info(message, data) { return this._log('INFO', message, data); }
    warn(message, data) { return this._log('WARN', message, data); }
    error(message, data) { return this._log('ERROR', message, data); }

    getLogs() { return [...this.logs]; }
    clearLogs() { this.logs = []; }
}

export default new Logger();
