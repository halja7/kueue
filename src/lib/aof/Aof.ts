import fs from 'fs';
import { AofOptions, AofReadOptions, AofWriteOptions } from '.'


/**
 * Logfile class
 */
export default class Aof {
  options: AofOptions;

  constructor(options: AofOptions) {
    this.options = options;

    fs.existsSync(this.options.path) || fs.mkdirSync(this.options.path);
  }

  /**
  * Append data to the logfile
  */
  async write({ seq, id, data, meta }: AofWriteOptions) {
    try {
      const line = `${seq} ${id} ${data} ${meta}`;
      await fs.promises.appendFile(this.options.filename, line);
    } catch(err: unknown) {
      // TODO: actually do something
      console.error(err);
    }
  }

  async read(options: AofReadOptions) {

  }
}

