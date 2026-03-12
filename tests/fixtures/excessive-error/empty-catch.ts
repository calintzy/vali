// fixture: 빈 catch 블록
function riskyOperation() {
  try {
    JSON.parse('{"key": "value"}');
  } catch (e) {
    // 빈 catch — VAL008 감지 대상
  }
}

// console만 있는 catch
function anotherRisky() {
  try {
    JSON.parse('bad json');
  } catch (e) {
    console.log(e);
  }
}
