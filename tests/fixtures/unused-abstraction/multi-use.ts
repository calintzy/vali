// 다회 사용되는 인터페이스
interface Logger {
  log(msg: string): void;
  error(msg: string): void;
  warn(msg: string): void;
}

class ConsoleLogger implements Logger {
  log(msg: string) { console.log(msg); }
  error(msg: string) { console.error(msg); }
  warn(msg: string) { console.warn(msg); }
}

class FileLogger implements Logger {
  log(msg: string) { console.log(`[FILE] ${msg}`); }
  error(msg: string) { console.error(`[FILE] ${msg}`); }
  warn(msg: string) { console.warn(`[FILE] ${msg}`); }
}

function createLogger(type: string): Logger {
  return type === 'file' ? new FileLogger() : new ConsoleLogger();
}
