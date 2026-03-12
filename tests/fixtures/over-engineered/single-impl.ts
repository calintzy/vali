// fixture: 단일 구현체 인터페이스
interface DataProcessor {
  process(data: string): string;
  validate(data: string): boolean;
  transform(data: string): string;
}

class JsonProcessor implements DataProcessor {
  process(data: string): string {
    return JSON.stringify(data);
  }
  validate(data: string): boolean {
    try { JSON.parse(data); return true; } catch { return false; }
  }
  transform(data: string): string {
    return data.toUpperCase();
  }
}

// DataProcessor는 구현체가 1개뿐 → VAL005 감지 대상
