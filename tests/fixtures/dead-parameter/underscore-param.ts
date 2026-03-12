// _ prefix는 skip
function handler(_req: unknown, res: { send: (s: string) => void }) {
  res.send('ok');
}

// 중간 파라미터 미사용은 skip
function middleware(req: unknown, res: unknown, next: () => void) {
  next();
}
