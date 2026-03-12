// 패턴: 타입 시스템 기반 불가능한 에러
// 동기 순수 함수만 있는 try-catch → 불필요

function safeAdd(a: number, b: number): number {
  return a + b;
}

function safePure(): string {
  return 'hello';
}

// 이 try-catch는 불필요 — 모든 함수 호출이 안전함
function doSomething() {
  try {
    const result = safeAdd(1, 2);
    const msg = safePure();
    const arr = [1, 2, 3].map(x => x * 2);
  } catch (e) {
    console.error('impossible error', e);
  }
}
