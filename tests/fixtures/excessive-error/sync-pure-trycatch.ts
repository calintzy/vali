// 불필요한 try-catch: 에러 발생 불가능한 코드
function safeMath(a: number, b: number) {
  try {
    const sum = a + b;
    const product = a * b;
    return Math.max(sum, product);
  } catch (err) {
    return 0;
  }
}

// 빈 catch
function emptyHandler(data: string) {
  try {
    JSON.parse(data);
  } catch (e) {
  }
}

// console.log만 있는 catch
function logOnly(data: string) {
  try {
    JSON.parse(data);
  } catch (e) {
    console.log(e);
  }
}
