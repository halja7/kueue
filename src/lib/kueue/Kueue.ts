import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { KueueOptions, KueueEvents, Message } from '.';
import { FSLog, MemLog } from '../log'
import { Log, LogEvents } from '../log';

/**
 * Logfile class
 *
 *
 * enqueue: Exposes append with formatting for inputs
 * next: Pulls the next item of work given the latest offset
 *
 * next returns a commit function that can be used to 
 * increment the offset
 *
 * commit(id) => () => updateOffset(id)
 *
 */
export class Kueue extends EventEmitter {
  private writeStream: fs.WriteStream | null = null;
  private log: Log;
  private offset = 0
  name: string;

  constructor(options: KueueOptions) {
    super();
    this.name = options.name;
    // default is persistence enabled
    if (!options.persistence?.enabled) {
      this.log = new MemLog({
        bufferSize: 200,
      });
    } else {
      if (!options.persistence.dir) {
        throw new Error('must specify "persistence.dir" property when persistence.enabled');
      }

      this.log = new FSLog({
        path: path.join(options.persistence.dir, `${options.name}.log`),
        bufferSize: 200,
        flushAfter: 500,
      });

      this.writeStream = fs.createWriteStream(
        path.join(options.persistence.dir, `${options.name}.offset`),
        {
          flags: 'a',
          highWaterMark:  1,
        }
      );
    }

    // set up listeners for log events
    this.log.on(LogEvents.COMMIT_OFFSET, (seq: number) => {
      if (this.offset !== seq) {
        this.offset = Math.max(this.offset, seq);
        this.writeStream?.write(`${++this.offset}\n`, 'utf8', () => {
          this.emit(KueueEvents.UPDATE_OFFSET, this.offset);
        });
      }
    });

    this.log.on(LogEvents.WRITE_FLUSH, (seq: number) => {
      this.emit(KueueEvents.LOG_FLUSH, seq);
    });
  }

  /**
   * Queue a new message
   */
  async enqueue(batch: Message[]) {
    try {
      const lines = batch.map(({ key, data, meta }) => {
        let line = `${key} ${ typeof data == 'string' ? data : JSON.stringify(data) }`;
        line += meta ? ` ${JSON.stringify(meta)}` : '';
        return line;
      });

      return await this.log.append(lines);
    } catch (err: unknown) {
      // TODO: actually do something
      console.error(err);
    }
  }

  /**
   * Returns the next message
   */
  next() {
    return this.log.next();
  }

  /**
   * Returns the current offset
   */
  lastOffset() {
    return this.offset;
  }
}

