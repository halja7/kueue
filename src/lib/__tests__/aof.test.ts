import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  expect,
  test,
  afterAll,
} from 'vitest';

import { AppendOnly } from '../aof';
import { FSLog } from '../logfile';

const AOF_TEST_DIR = path.join("/tmp", "aof_tests");
afterAll(() => {
  fs.rmdir(AOF_TEST_DIR, { recursive: true }, err => {
    if (err) {
      console.error(err);
    }
  });
});

test('reads and writes to a file on the filesystem', async () => {
  const filename = `${Math.random().toString().split('.')[1]}.priority.log`;
  const filepath = path.join(AOF_TEST_DIR, filename);
  const log = new FSLog({ path: filepath });
  const aof = new AppendOnly(log);

  const uuid = crypto.randomUUID();

  const appends = [
    aof.append({ id: uuid, data: 'test' }),
    aof.append({ id: uuid + 1, data: 'test' }),
    aof.append({ id: uuid + 2, data: 'test' }),
    aof.append({ id: uuid + 3, data: 'test' }),
    aof.append({ id: uuid + 4, data: 'test' }),
  ];

  await Promise.all(appends);

  return new Promise((resolve) => {
    log.on('flush', () => {
      console.log('reading filepath', filepath);
      const file = fs.readFileSync(filepath, 'utf8')
      expect(file).toBeTruthy();
      console.log(file)
      resolve(true);
    });
  });
});
