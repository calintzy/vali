class UserService {
  getUser() { return { name: 'test' }; }
}

// 불필요한 Factory: new만 호출
function createUserService() {
  return new UserService();
}

// pass-through 래핑
function getValue(key: string) {
  return getFromStore(key);
}

function getFromStore(key: string) {
  return key;
}
