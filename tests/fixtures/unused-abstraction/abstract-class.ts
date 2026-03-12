// fixture: 미사용 추상 클래스
abstract class BaseRepository {
  abstract findById(id: string): unknown;
  abstract save(entity: unknown): void;
  abstract delete(id: string): void;
}

// BaseRepository를 아무도 상속하지 않음 → VAL010 감지 대상
function doSomething() {
  return 'hello';
}
