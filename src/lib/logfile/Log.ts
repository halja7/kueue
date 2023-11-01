import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import EventEmitter from 'node:events';
import { LogOptions, LogfileReadOptions, Log } from '.';

export class FSLog extends EventEmitter implements Log {
  private readonly lines: string[] = [];
  private readStream: NodeJS.ReadableStream;
  private writeStream: NodeJS.WritableStream;
  // private highest_seq = 0;
  open = false;

  constructor(private readonly options: LogOptions) {
    super();
    this.loadFile(options.path);

    this.readStream = fs.createReadStream(this.options.path);
    const rl = readline.createInterface({
      input: this.readStream,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', (line: string) => {
      console.log('Line from file:', line);
      this.lines.push(line);
    });

    rl.on('close', () => {
      console.log('done reading file.');
    });

    this.writeStream = fs.createWriteStream(
      this.options.path, 
      { 
        flags: 'a', 
        highWaterMark: this.options.flushAfter ?? 300
      }
    );

    this.writeStream.on('drain', () => {
      this.emit('flush')
    });
  }

  private loadFile(filepath: string) {
    if (!fs.existsSync(filepath)) {
      const dir = path.join("/", ...filepath.split('/').slice(0, -1))
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filepath, '');
    } 
  }

  getLines() {
    return this.lines;
  }

  async initialize(): Promise<void> {
    // read file from end to beginning
  }

  async tombstone(ids: number[]): Promise<void> {
    ids;
    throw new Error('Method not implemented.');
  }

  async append(lines: string[]): Promise<void> {
    const data = lines.join('\n') + '\n';
    this.writeStream.write(data);
  }

  async read(options: LogfileReadOptions): Promise<string[]> {
    options;
    throw new Error('Method not implemented.');
  }
}

// export class MemLog implements Log {
//   private readonly lines: string[] = [];
//
//   async append(lines: string[]): Promise<void> {
//     for (const line of lines) {
//       await this.appendLine(line);
//     }
//   }
//
//   async read(options: LogfileReadOptions): Promise<string[]> {
//     throw new Error("Method not implemented.");
//   }
// }
