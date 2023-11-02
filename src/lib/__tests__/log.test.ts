import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, test, afterAll } from 'vitest';
import { FSLog, LogEvents, MemLog } from '../log';

describe('In-memory Log tests', () => {
  test('should append to log and process records', async () => {
    const log = new MemLog({ bufferSize: 100 });

    const appends = [
      log.append(['test0', 'test1', 'test2']),
      log.append(['test3', 'test4', 'test5']),
      log.append(['test6', 'test7', 'test8', 'test9']),
    ];

    await Promise.all(appends);

    const records = log.read();
    expect(records.length).toBe(10);

    for (const [i, record] of records.entries()) {
      // assert for expected order
      expect(record.data).toBe(`${i} test${i}`);
      const { offset } = record.commitOffset();
      expect(log.size() - offset);
    }
  });

  test('should not append to full log', async () => {
    const log = new MemLog({ bufferSize: 10 });

    const appends = [
      () => log.append(['test0', 'test1', 'test2']),
      () => log.append(['test3', 'test4', 'test5']),
      () => log.append(['test6', 'test7', 'test8', 'test9']),
      () => log.append(['test10', 'test11']), // is allowed, but sets open = false
      () => log.append(['test12', 'test13']), // blocked
    ];

    const results = await Promise.all(appends.map(append => append()));
    const rejected = appends.filter((_, i) => !results[i]);

    expect(results[results.length - 1]).toBe(false); // final attempt (appends[4]) rejected

    const records = log.read();
    expect(records.length).toBe(12); // not include test12 and test13

    let record;
    while ((record = log.next())) {
      record.commitOffset();
    }

    // retry rejected appends
    for (const append of rejected) {
      append();
    }

    expect(log.size()).toBe(2);
    expect(log.read()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ data: '12 test12' }),
        expect.objectContaining({ data: '13 test13' }),
      ]),
    );
  });
});

describe('File system dependent Log tests', () => {
  const AOF_TEST_DIR = path.join('/tmp', 'aof_tests');
  afterAll(() => {
    fs.rm(AOF_TEST_DIR, { recursive: true }, err => {
      if (err) {
        console.error(err);
      }
    });
  });

  test('persists to disk and fills buffer', async () => {
    const filename = `${Math.random().toString().split('.')[1]}.priority.log`;
    const filepath = path.join(AOF_TEST_DIR, filename);
    const log = new FSLog({
      path: filepath,
      bufferSize: 50,
      flushAfter: 100,
    });

    const TOTAL_APPENDS = 14;

    const appends = [
      () => log.append(['test0', 'test1', 'test2']),
      () => log.append(['test3', 'test4', 'test5']),
      () => log.append(['test6', 'test7', 'test8', 'test9']),
      () => log.append(['test10', 'test11']),
      () => log.append(['test12', 'test13']),
    ];

    const results = await Promise.all(appends.map(append => append()));
    expect(results.every(result => result)).toBe(true);

    expect(log.size()).toBe(0); // haven't flushed to file yet

    return new Promise(resolve => {
      log.on(LogEvents.WRITE_FLUSH, () => {
        const fileData = fs
          .readFileSync(filepath, { encoding: 'utf8' })
          .split('\n')
          .filter(line => line.length > 0); // filter out '' final line

        if (log.size() == TOTAL_APPENDS && fileData.length == TOTAL_APPENDS) {
          resolve(true);
        }
      });
    });
  });

  test('persists to disk and fills buffer', async () => {
    const filename = `${Math.random().toString().split('.')[1]}.priority.log`;
    const filepath = path.join(AOF_TEST_DIR, filename);
    const log = new FSLog({
      path: filepath,
      bufferSize: 100,
      flushAfter: 100,
    });

    expect(log.size()).toBe(0); // reads nothing from file

    const TOTAL_APPENDS = 9;

    const appends = [
      () => log.append(['test0', 'test1', 'test2']),
      () => log.append(['test3', 'test4', 'test5']),
      () => log.append(['test6', 'test7', 'test8']),
    ];

    const results = await Promise.all(appends.map(append => append()));
    expect(results.every(result => result)).toBe(true);
    expect(log.size()).toBe(0); // haven't flushed to file yet

    await new Promise(resolve => {
      log.on(LogEvents.WRITE_FLUSH, () => {
        resolve(true);
      });
    });

    expect(log.size()).toBe(TOTAL_APPENDS); // flushed to file

    const log2 = new FSLog({
      path: filepath,
      bufferSize: 100,
      flushAfter: 100,
    });

    expect(log2.size()).toBe(TOTAL_APPENDS); // reads from file

    // process a little something something
    let record;
    while ((record = log2.next())) {
      record.commitOffset();
    }

    expect(log2.size()).toBe(0); // reads nothing out of buffer
    expect(log2.next()).toBe(null); // reads nothing from buffer
  });

  test('starts new log object from offset', async () => {
    const filename = `${Math.random().toString().split('.')[1]}.priority.log`;
    const filepath = path.join(AOF_TEST_DIR, filename);
    const log = new FSLog({
      path: filepath,
      bufferSize: 100,
      flushAfter: 100,
    });

    const TOTAL_APPENDS = 18;
    const appends = [
      () => log.append(['test0', 'test1', 'test2']),
      () => log.append(['test3', 'test4', 'test5']),
      () => log.append(['test6', 'test7', 'test8']),
      () => log.append(['test9', 'test10', 'test11']),
      () => log.append(['test12', 'test13', 'test14']),
      () => log.append(['test15', 'test16', 'test17']),
    ];
    await Promise.all(appends.map(append => append()));

    await new Promise(resolve => {
      log.on(LogEvents.WRITE_FLUSH, () => {
        resolve(true);
      });
    });

    const OFFSET = 3;
    const log2 = new FSLog({
      path: filepath,
      fromOffset: TOTAL_APPENDS - OFFSET,
      bufferSize: 100,
      flushAfter: 100,
    });

    expect(log2.size()).toBe(OFFSET);
    const next = log2.next();
    next?.commitOffset();

    expect(next?.data).toBe('15 test15');
    expect(log2.next()?.data).toBe('16 test16');
  });
});
