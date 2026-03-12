import { magic } from 'express-validator/magic';
import { nonExistent } from 'totally-fake-package-xyz';

const x = magic();
const y = nonExistent();
