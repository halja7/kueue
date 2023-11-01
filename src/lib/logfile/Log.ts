import fs from 'node:fs';
import { LogfileReadOptions, Log } from '.';

export class FSLog implements Log {
  constructor(private readonly options: { filename: string }) {}

  async append(lines: string[]): Promise<void> {
    await fs.promises.appendFile(this.options.filename, data);
  }

  async read(options: LogfileReadOptions): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
}

export class MemLog implements Log {
  private readonly lines: string[] = [];

  async append(lines: string[]): Promise<void> {
    for (const line of lines) {
      await this.appendLine(line);
    }
  }

  async read(options: LogfileReadOptions): Promise<string[]> {
    throw new Error("Method not implemented.");
  }

}
