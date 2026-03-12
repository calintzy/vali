// 1회만 사용되는 인터페이스 (export 안됨)
interface DataProcessor {
  process(data: string): string;
  validate(data: string): boolean;
  transform(data: string): string;
}

class SimpleProcessor implements DataProcessor {
  process(data: string) { return data; }
  validate(data: string) { return data.length > 0; }
  transform(data: string) { return data.trim(); }
}
