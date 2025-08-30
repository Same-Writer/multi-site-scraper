const fs = require('fs');
const path = require('path');

class Logger {
  constructor(config) {
    this.config = config;
    this.debugConfig = config.debug || {};
    this.logEntries = [];
    this.debugLogPath = null;
    this.lineNumber = 0;
    this.originalConsole = {};
    
    // Initialize debug logging if enabled
    if (this.debugConfig.enabled) {
      this.initializeDebugLogging();
      this.interceptConsole();
    }
  }

  initializeDebugLogging() {
    const debugFile = this.debugConfig.file || './logs/debug.log';
    const mode = this.debugConfig.mode || 'append';
    
    // Ensure logs directory exists
    const logDir = path.dirname(debugFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Handle different logging modes
    if (mode === 'overwrite') {
      this.debugLogPath = debugFile;
      // Clear the file if it exists
      if (fs.existsSync(debugFile)) {
        fs.writeFileSync(debugFile, '');
      }
    } else if (mode === 'unique') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(debugFile);
      const base = path.basename(debugFile, ext);
      const dir = path.dirname(debugFile);
      this.debugLogPath = path.join(dir, `${base}_${timestamp}${ext}`);
    } else {
      // Default to append mode
      this.debugLogPath = debugFile;
    }

    // Write initial log entry
    this.writeToDebugLog(`=== Debug Log Started: ${new Date().toISOString()} ===\n`);
    this.writeToDebugLog(`Log Mode: ${mode}\n`);
    this.writeToDebugLog(`Log File: ${this.debugLogPath}\n`);
    this.writeToDebugLog('='.repeat(60) + '\n\n');
  }

  writeToDebugLog(message) {
    if (this.debugLogPath) {
      fs.appendFileSync(this.debugLogPath, message);
    }
  }

  formatLogEntry(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length > 0 ? ` [${JSON.stringify(context)}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}\n`;
  }

  debug(message, context = {}) {
    this.log('debug', message, context);
  }

  info(message, context = {}) {
    this.log('info', message, context);
  }

  warn(message, context = {}) {
    this.log('warn', message, context);
  }

  error(message, context = {}) {
    this.log('error', message, context);
  }

  getDebugLogPath() {
    return this.debugLogPath;
  }

  getAbsoluteDebugLogPath() {
    if (this.debugLogPath) {
      return path.resolve(this.debugLogPath);
    }
    return null;
  }

  displayLogPathOnExit() {
    if (this.debugConfig.enabled && this.debugConfig.displayPath && this.debugLogPath) {
      const absolutePath = this.getAbsoluteDebugLogPath();
      const hostPath = this.debugLogPath.replace('./logs/', './logs/');
      
      // Use original console to avoid interception during shutdown
      this.originalConsole.log('\n' + '='.repeat(80));
      this.originalConsole.log('DEBUG LOG LOCATION:');
      this.originalConsole.log('='.repeat(80));
      this.originalConsole.log(`Container path: ${absolutePath}`);
      this.originalConsole.log(`Host path: ${hostPath}`);
      this.originalConsole.log('='.repeat(80));
      this.originalConsole.log('Copy commands for easy access:');
      this.originalConsole.log(`# From host system:`);
      this.originalConsole.log(`cat "${hostPath}"`);
      this.originalConsole.log(`# From inside container:`);
      this.originalConsole.log(`cat "${absolutePath}"`);
      this.originalConsole.log('='.repeat(80) + '\n');
    }
  }

  interceptConsole() {
    // Store original console methods
    this.originalConsole.log = console.log;
    this.originalConsole.error = console.error;
    this.originalConsole.warn = console.warn;
    this.originalConsole.info = console.info;

    // Override console methods to capture all output
    console.log = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      this.logConsoleOutput('info', message);
      this.originalConsole.log(...args);
    };

    console.error = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      this.logConsoleOutput('error', message);
      this.originalConsole.error(...args);
    };

    console.warn = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      this.logConsoleOutput('warn', message);
      this.originalConsole.warn(...args);
    };

    console.info = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      this.logConsoleOutput('info', message);
      this.originalConsole.info(...args);
    };
  }

  logConsoleOutput(level, message) {
    const formattedMessage = this.formatLogEntry(level, message);
    
    if (this.debugConfig.enabled) {
      this.writeToDebugLog(formattedMessage);
    }

    // Store in memory
    this.logEntries.push({
      timestamp: new Date().toISOString(),
      level,
      message
    });
  }

  log(level, message, context = {}) {
    const formattedMessage = this.formatLogEntry(level, message, context);
    
    // Always write to debug log if enabled
    if (this.debugConfig.enabled) {
      this.writeToDebugLog(formattedMessage);
    }

    // Store in memory for potential display
    this.logEntries.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    });

    // Also output to console based on level (using original methods to avoid recursion)
    if (level === 'error') {
      this.originalConsole.error(`[ERROR] ${message}`, context);
    } else if (level === 'warn') {
      this.originalConsole.warn(`[WARN] ${message}`, context);
    } else if (level === 'info') {
      this.originalConsole.info(`[INFO] ${message}`, context);
    } else if (level === 'debug' && this.config.level === 'debug') {
      this.originalConsole.log(`[DEBUG] ${message}`, context);
    }
  }

  restoreConsole() {
    if (this.originalConsole.log) {
      console.log = this.originalConsole.log;
      console.error = this.originalConsole.error;
      console.warn = this.originalConsole.warn;
      console.info = this.originalConsole.info;
    }
  }

  finalize() {
    if (this.debugConfig.enabled && this.debugLogPath) {
      this.writeToDebugLog(`\n${'='.repeat(60)}\n`);
      this.writeToDebugLog(`=== Debug Log Ended: ${new Date().toISOString()} ===\n`);
      this.writeToDebugLog(`Total log entries: ${this.logEntries.length}\n`);
    }
    
    // Restore original console methods
    this.restoreConsole();
  }
}

module.exports = Logger;
