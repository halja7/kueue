import { AofWriteOptions } from '.';
import { Log } from '../logfile';

const TOMBSTONE_TOKEN = '$T$';

/**
 * Logfile class
 */
export class AppendOnly {
  private records = new Set();
  log: Log;

  constructor(log: Log) {
    this.log = log;
  }

  /**
   * Append data to the logfile
   */
  async append({ id, data = '', meta = {}, tombstone }: AofWriteOptions) {
    try {
      const line = `${id} ${typeof data == 'string' ? data : JSON.stringify(data)} ${JSON.stringify(meta)}${tombstone ? ' ' + TOMBSTONE_TOKEN : ''}`;
      await this.log.append(line);
    } catch (err: unknown) {
      // TODO: actually do something
      console.error(err);
    }
  }

  /**
   * Reads from last actionable line to end of file
   * actionable == record without tombstone
  */
  read() {
    return this.log.read(line => !line.includes(TOMBSTONE_TOKEN));
  }

  async tombstone(id: string) {
    await this.append({ id, tombstone: true });
  } 
}
