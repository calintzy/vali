// 마지막 파라미터가 미사용
function processData(data: string[], options: Record<string, unknown>) {
  return data.map(d => d.trim());
}

// 화살표 함수에서 미사용
const transform = (input: string, format: string) => {
  return input.toUpperCase();
};
