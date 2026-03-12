class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  log(msg: string) {
    console.log(`[${this.prefix}] ${msg}`);
  }
}

// 적절한 Factory: 추가 로직 포함
function createLogger(name: string) {
  const logger = new Logger(name);
  logger.log('initialized');
  return logger;
}
