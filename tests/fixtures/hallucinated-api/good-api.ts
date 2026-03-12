const items = [1, 2, 3, 2, 1];

// 표준 API
const mapped = items.map(x => x * 2);
const filtered = items.filter(x => x > 1);
const found = items.find(x => x === 3);
const included = items.includes(2);
const lastItem = items.at(-1);
