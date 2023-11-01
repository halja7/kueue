import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { expect, test, afterAll } from 'vitest';

import { AppendOnly } from '../aof';
import { FSLog, LogEvents } from '../logfile';

const AOF_TEST_DIR = path.join('/tmp', 'aof_tests');
afterAll(() => {
  fs.rm(AOF_TEST_DIR, { recursive: true }, err => {
    if (err) {
      console.error(err);
    }
  });
});

/**
 * This test has fs dependency and is here for dev purposes.
 * Would disable in CI (maybe) and use MemLog implementation of Log interface.
 */
test('reads and writes to a file on the filesystem', async () => {
  const filename = `${Math.random().toString().split('.')[1]}.priority.log`;
  const filepath = path.join(AOF_TEST_DIR, filename);
  const log = new FSLog({ path: filepath, flushAfter: 200 });
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

  return new Promise(resolve => {
    log.on(LogEvents.WRITE_FLUSH, () => {
      const file = fs.readFileSync(filepath, 'utf8');
      expect(file).toBeTruthy();
      log.on('read:line', line => {
        expect(line.split(' ').length).toBe(4);
        resolve(true);
      });
    });
  });
});

test('initializes with correct offset from file', async () => {
  const filename = `${Math.random().toString().split('.')[1]}.priority.log`;
  const filepath = path.join(AOF_TEST_DIR, filename);
  const log = new FSLog({ path: filepath, flushAfter: 200 });
  const aof = new AppendOnly(log);

  let cursor = log.getCursor();
  expect(cursor).toBe(0);

  const appends = [];
  for (let i = 0; i < 100; i++) {
    const id = Math.random().toString().split('.')[1];
    appends.push(aof.append({ id, data: { test: "test data"} }));
  }

  await Promise.all(appends);

  log.on(LogEvents.WRITE_FLUSH, () => {
    let counter = 0
    log.on(LogEvents.READ_LINE, () => {
      counter++;
      if (counter === 100) {
        expect(log.getCursor()).toBe(100);
        log.emit(filename)
      }
    });
  })

  return new Promise(resolve => {
    log.on(filename, () => {
      const newLog = new FSLog({ path: filepath, flushAfter: 200 });
      expect(newLog.getCursor()).toBe(100);
      resolve(true);
    })
  })
});

