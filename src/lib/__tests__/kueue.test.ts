import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, expect, afterAll, test } from 'vitest';
import { Kueue, KueueEvents } from '../kueue';

/**
 * In-memory tests have no fs dependency and are ok for CI.
 * They use MemLog implementation of Log interface.
 */
describe('in-memory queue tests', () => {
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

    let count = 0;
    let record;
    while (record = queue.next()) {
      expect(record).toEqual(expect.objectContaining({
        data: expect.any(String),
        commitOffset: expect.any(Function)
      }));
      record.commitOffset();
      count += 1;
      if (!record) {
        expect(count).toBe(messages.length);
        break;
      };
    };
  });
});


/**
 * These tests have an fs dependency and are here for dev purposes.
 * We would disable in CI (maybe) and use MemLog 
 * implementation of Log interface.
 */
describe.skipIf(process.env.NODE_ENV === 'CI')('FS-dependent Kueue test', () => {
  const AOF_TEST_DIR = path.join('/tmp', 'kueue', 'test');
  afterAll(() => {
    fs.rm(AOF_TEST_DIR, { recursive: true }, err => {
      if (err) {
        console.error(err);
      }
    });
  });

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

  test('tracks last offset on disk and restarts from there', async () => {
    const MESSAGE_COUNT = 100;
    // buffer size in FSLog defaults to 200 
    // (not confurable yet)
    const name = `${Math.floor(Math.random() * 10000)}.priority`;
    const queue = new Kueue({  
      name,
      persistence: { 
        enabled: true,
        dir: AOF_TEST_DIR
      } 
    });

    queue.once(KueueEvents.LOG_FLUSH, (offset) => {
      // process half of the messages
      while (offset > 50) {
        const record = queue.next();
        expect(record).toEqual(expect.objectContaining({ data: expect.any(String) }));
        record?.commitOffset();
        offset -= 1;
      };
    });

    queue.once(KueueEvents.UPDATE_OFFSET, (offset) => {
      queue.emit('test:continue', offset)
    });

    const messages = Array(MESSAGE_COUNT)
      .fill(null)
      .map((_, i) => {
        return {
          key: crypto.randomUUID(),
          data: { name: `test-${i}`, createdAt: Date.now() },
          meta: { priority: Math.floor(Math.random() * 10) }
        }
      });
    await queue.enqueue(messages);

    return new Promise((resolve) => {
      queue.on('test:continue', (offset) => {

        expect(queue.lastOffset()).toBe(MESSAGE_COUNT / 2);
        expect(queue.lastOffset()).toBe(offset);
        const restartedQueue = new Kueue({  
          name,
          persistence: { 
            enabled: true,
            dir: AOF_TEST_DIR
          },
        });

        expect(restartedQueue.lastOffset()).toBe(MESSAGE_COUNT / 2);
        let record = restartedQueue.next();
        const [seq, _, data] = record?.data?.split(' ') || [];
        expect(Number(seq)).toBe(50);
        expect(JSON.parse(data)).toEqual(expect.objectContaining({ name: 'test-50' }));
        resolve(true);
      });
    });
  });
});

