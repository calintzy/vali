// fixture: interface 구현 메서드 — skip 대상
interface Logger {
  log(message: string, level: string): void;
}

class ConsoleLogger implements Logger {
  // level은 interface 계약에 의해 필요하므로 skip
  log(message: string, level: string): void {
    console.log(message);
  }
}

// 콜백 시그니처 패턴 — skip 대상
function middleware(req: any, res: any, next: any): void {
  res.send('ok');
}

function errorHandler(err: any, req: any, res: any, next: any): void {
  res.status(500).send('error');
}
