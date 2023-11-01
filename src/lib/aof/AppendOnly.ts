import { AofOptions, AofReadOptions, AofWriteOptions } from '.';
import { Log } from '../logfile';

/**
 * Logfile class
 */
export class AppendOnly {
  options?: AofOptions;
  log: Log;

  constructor(log: Log, options?: AofOptions) {
    this.options = options;
    this.log = log;
  }

  /**
   * Append line to the logfile
   */
  async append({ seq, id, data, meta }: AofWriteOptions) {
    try {
      const line = `${seq} ${id} ${data} ${meta}`;
      await this.log.append([line]);
    } catch (err: unknown) {
      // TODO: actually do something
      console.error(err);
    }
  }

  async read(options: AofReadOptions) {
    options;
  }
}
