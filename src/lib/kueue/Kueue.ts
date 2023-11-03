import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { KueueOptions, KueueEvents, Message } from '.';
import { FSLog, MemLog } from '../log'
import { Log, LogEvents } from '../log';

/**
 * Kueue class
 *
 * enqueue: Exposes append with formatting for inputs
 * next: Pulls the next item of work given the latest offset
 *
 * next returns a commitOffset function that can be used to 
 * persist (if enabled) and increment the offset
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

    if (!options.persistence?.enabled) {
      this.log = new MemLog({
        bufferSize: 200,
      });
    } else {
      // default is persistence enabled
      if (!options.persistence.dir) {
        throw new Error('must specify "persistence.dir" property when persistence.enabled');
      }

      const persistedOffsetFilepath = path.join(options.persistence.dir, `${options.name}.offset`);
      this.writeStream = fs.createWriteStream(
        persistedOffsetFilepath,
        {
          flags: 'a',
          highWaterMark:  10,
        }
      );
      this.readPersistedOffset(persistedOffsetFilepath);

      this.log = new FSLog({
        path: path.join(options.persistence.dir, `${options.name}.log`),
        bufferSize: 200,
        flushAfter: 500,
        // offset will be either 0 or the last persisted offset for name
        fromOffset: this.offset, 
      });
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

    this.emit.bind(this);
    this.log.on(LogEvents.WRITE_FLUSH, (seq: number) => {
      this.emit(KueueEvents.LOG_FLUSH, seq);
    });
  }

  private readPersistedOffset(filepath: string) {
    if (!fs.existsSync(filepath)) {
      const dir = path.join('/', ...filepath.split('/').slice(0, -1));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filepath, '');
    }

    const persistedOffsetData = fs
      .readFileSync(filepath, { encoding: 'utf8' })
      .split('\n')
      .filter(line => line.length > 0);

    if (persistedOffsetData.length > 0) {
      this.offset = parseInt(persistedOffsetData[persistedOffsetData.length - 1]);
    }
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

