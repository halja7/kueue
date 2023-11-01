import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import EventEmitter from 'node:events';
import { LogOptions, LogEvents, Log } from '.';


/**
 * File system-based implementation of Log interface
 *
 * Automatically sequences all appended records and
 * emits events when new lines are read from the file.
 *
 * Maintains an in-memory buffer from which records can be read.
 * This buffer is *a side-effect* of disk-persistence and thus
 * the records it contains are durable. It is used to keep track
 * of live records that must be tombstoned.
 *
 */
export class FSLog extends EventEmitter implements Log {
  private readonly buffer: string[] = [];
  private readStream: fs.ReadStream | null = null;
  private writeStream: fs.WriteStream;
  private highestSeq = 0;
  open = false;

  constructor(private readonly options: LogOptions) {
    super();
    this.loadFile(options.path);

    this.writeStream = fs.createWriteStream(this.options.path, {
      flags: 'a',
      highWaterMark: this.options.flushAfter ?? 500,
    });

    this.writeStream.on('drain', () => {
      this.emit(LogEvents.WRITE_FLUSH);
      this.readStream?.close();
      this.readNewLines();
    });

    this.advanceCursor();
  }

  private loadFile(filepath: string) {
    if (!fs.existsSync(filepath)) {
      const dir = path.join('/', ...filepath.split('/').slice(0, -1));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filepath, '');
    }
  }

  private readNewLines() {
    this.readStream = fs.createReadStream(this.options.path, {
      encoding: 'utf8',
      highWaterMark: this.options.flushAfter ?? 500,
    });
    const rl = readline.createInterface({
      input: this.readStream,
      terminal: false,
    });

    rl.on('line', line => {
      this.buffer.push(line);
      this.emit(LogEvents.READ_LINE, line);
    });
  }

  async append(line: string): Promise<void> {
    // assign sequence number
    const data = `${++this.highestSeq} ${line}\n`
    this.writeStream.write(data);
  }

  getCursor() {
    return this.highestSeq;
  }

  close() {
    this.writeStream.close();
    this.readStream?.close();
  }

  read(predicate?: (line: string) => boolean): string[] {
    return this.buffer.filter(predicate ?? (() => true));
  }

  advanceCursor(): number {
    // read file from end to beginning
    const stats = fs.statSync(this.options.path);
    const size = stats.size;
    const BUFFER_SIZE = 1000;
    const start = Math.max(size - BUFFER_SIZE, 0);
    const buffer = Buffer.alloc(BUFFER_SIZE);

    const fd = fs.openSync(this.options.path, 'r');

    // Start reading from the end of the file.
    let bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE, start);

    while (bytesRead > 0) {
      const lines = buffer.toString('utf8', 0, bytesRead).split('\n');
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 2]; // last line is empty
        const seq = parseInt(lastLine.split(' ')[0], 10);
        this.highestSeq = seq;
        break;
      }
    }

    fs.closeSync(fd);
    return this.highestSeq;
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
