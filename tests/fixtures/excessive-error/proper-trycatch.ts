// 적절한 try-catch: JSON.parse는 에러 발생 가능
function parseConfig(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`설정 파싱 실패: ${err}`);
  }
}

// async/await는 allowAsync 기본값으로 허용
async function fetchData(url: string) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    throw new Error(`요청 실패: ${err}`);
  }
}
