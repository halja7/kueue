import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, expect, afterAll, test } from 'vitest';
import { Kueue, KueueEvents } from '../kueue';

test('enqueues and dequeues messages', async () => {
  const name = `${Math.random().toString().split('.')[1]}.priority.aof`;
  const queue = new Kueue({ name, persistence: { enabled: false } });

  const messages = Array(10)
    .fill(null)
    .map(() => {
      return {
        key: crypto.randomUUID(),
        data: { name: 'test', createdAt: Date.now() },
        meta: { priority: Math.floor(Math.random() * 10) }
      }
    });

  await queue.enqueue(messages);
  expect(queue.lastOffset()).toBe(10);

  let record;
  while (record = queue.next()) {
    record.commitOffset();
  }

  expect(queue.lastOffset()).toBe(10); // should not decrease
  expect(queue.next()).toBe(null); // aof log cursor is at top
});


describe('FS-dependent Kueue test', () => {
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
  test('enqueues and dequeues messages using fs', async () => {
    const MESSAGE_COUNT = 10;
    const queue = new Kueue({ 
      name: `${Math.floor(Math.random() * 10000)}.priority`, 
      persistence: { 
        enabled: true,
        dir: AOF_TEST_DIR
      } 
    });

    const messages = Array(MESSAGE_COUNT)
      .fill(null)
      .map(() => {
        return {
          key: crypto.randomUUID(),
          data: { name: 'test', createdAt: Date.now() },
          meta: { priority: Math.floor(Math.random() * 10) }
        }
      });

    // wait for writes to disk
    // consumers won't care... they'll just call next();
    await queue.enqueue(messages);

    return new Promise((resolve) => {
      queue.on(KueueEvents.LOG_FLUSH, (offset) => {
        expect(offset).toBe(MESSAGE_COUNT);
        let record;
        while (record = queue.next()) {
          record.commitOffset();
        }
      });

      queue.on(KueueEvents.UPDATE_OFFSET, (offset) => {
        expect(offset).toBe(MESSAGE_COUNT);
        resolve(true);
      });
    });
  });
});

