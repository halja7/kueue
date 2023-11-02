import { KueueOptions, Message } from '.';
import { FSLog, MemLog } from '../log'
import type { Log } from '../log';


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
export class Kueue {
  log: Log;
  cursor = 0

  constructor(options: KueueOptions) {
    if (options.persistence.enabled) {
      this.log = new FSLog({
        path: options.persistence.path,
        bufferSize: 200,
        flushAfter: 500,
      });
    } else {
      this.log = new MemLog({
        bufferSize: 200,
      });
    }
  }

  /**
   * Append data to the logfile
   */
  async enqueue(batch: Message[]) {
    try {
      const line = `${id} ${
        typeof data == 'string' ? data : JSON.stringify(data)
      } ${JSON.stringify(meta)}${tombstone ? ' ' + TOMBSTONE_TOKEN : ''}`;
      await this.log.append(lines);
    } catch (err: unknown) {
      // TODO: actually do something
      console.error(err);
    }
  }

  /**
   * Reads from last actionable line to end of file
   * actionable == record without tombstone
   */
  next() {
    return {
      data: <next thing>,
      commit: this.commit(data.seq).bind(this)
    }
  }

  private commit(seq: number) {
    return () => {
      this.cursor = seq;
    };
  }
}
