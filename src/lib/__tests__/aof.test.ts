import fs from 'node:fs';
import path from 'node:path';
import { 
  expect, 
  test,
  afterAll
} from 'vitest'

import Aof from '../aof/Aof';


const AOF_DIR = path.join(__dirname,'tests-aofs');
afterAll(() => {
  fs.rmdir(AOF_DIR, { recursive: true }, (err) => {
    if (err) {
      console.error(err);
    }
  });
});

test('reads and writes to a file', () => {
  const filename = `${Math.random()}.priority.log`
  const logfile = new Aof({ 
    path: path.join(__dirname, AOF_DIR),
    filename,

  });

  logfile.write('test');
  expect(logfile.read()).toBe('test');
});
