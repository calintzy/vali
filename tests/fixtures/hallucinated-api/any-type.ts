// fixture: any 타입 skip 테스트
const client: any = {};

// any 타입의 메서드 호출은 검사 불가 → skip
client.nonExistentMethod();
client.anotherFakeApi.call();
