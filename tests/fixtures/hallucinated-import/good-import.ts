import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const content = readFileSync('test.txt', 'utf-8');
const path = resolve('.');
