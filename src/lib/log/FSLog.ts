import fs from 'node:fs';
import path from 'node:path';
import EventEmitter from 'node:events';
import { LogOptions, LogEvents, LogRecord, Log } from '.';
import { LinkedList } from './LinkedList';

interface FSLogSeekOptions {
  offset: number;
}

/**
 * File system-based implementation of Log interface
 *
 * Responsible for sequencing all appended records and
 * emits events when new lines are read from the file.
 *
 * Maintains an in-memory buffer from which records can be read.
 * This buffer is *a side-effect* of disk-persistence and thus
 * the records it contains are durable. It is used to keep track
 * of live records that must be tombstoned.
 *
 * FSLog advances the offset to the latest position on instantiation
 * if the specified file exists. Otherwise starts at 0.
 *
 */
export class FSLog extends EventEmitter implements Log {
  private buffer = new LinkedList<string>();
  private writeStream: fs.WriteStream;
  private highestSequenceNumber = 0;
  open = false;

  constructor(private options: LogOptions & { path: string }) {
    super();

    this.loadFile(options.path);

    this.writeStream = fs.createWriteStream(options.path, {
      flags: 'a',
      highWaterMark: this.options.flushAfter ?? 500,
    });

    this.seek({ offset: options.fromOffset ?? 0 });
  }

  private isOpen() {
    return !(this.buffer.size() > this.options.bufferSize);
  }

  private loadFile(filepath: string) {
    if (!fs.existsSync(filepath)) {
      const dir = path.join('/', ...filepath.split('/').slice(0, -1));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filepath, '');
    }
  }

  size() {
    return this.buffer.size();
  }

  async append(lines: string[]): Promise<boolean> {
    if (!this.isOpen()) {
      return false;
    }

    const data = lines.map(line => `${this.highestSequenceNumber++} ${line}`);

    // force everything into memory (transactionalize the write)
    this.writeStream.cork();

    this.writeStream.write(`${data.join('\n')}\n`, 'utf8', err => {
      if (err) {
        // TODO: what to do here...?
        // if something fails.. we need to rollback? nothing has flushed yet.
        // maybe it all returns false and we consider the batch DOA
        return;
      }

      // console.log('flushed. buffering data: ', data);
      for (const line of data) {
        const [seq] = line.split(' ');
        this.buffer.add(Number(seq), line);
      }


      this.emit(LogEvents.WRITE_FLUSH, this.highestSequenceNumber);
    });

    // flush to disk!
    process.nextTick(this.writeStream.uncork.bind(this.writeStream));

    return true;
  }

  next(): LogRecord | null {
    const current = this.buffer.head;
    if (!current) return null;

    return {
      data: current.data,
      commitOffset: () => {
        this.buffer.remove(current.seq);
        this.emit(LogEvents.COMMIT_OFFSET, current.seq)
        return { offset: current.seq, error: null };
      },
    };
  }

  read(): LogRecord[] {
    const data = this.buffer.map(line => {
      const [seq] = line.split(' ');
      const commitOffset = () => {
        try {
          this.buffer.remove(Number(seq));
          return { offset: Number(seq), error: null };
        } catch (err: unknown) {
          return {
            offset: Number(seq),
            error: err instanceof Error ? err : new Error('Unknown error'),
          };
        }
      };

      return { data: line, commitOffset: commitOffset.bind(this) };
    });

    return data;
  }

  private seek({ offset }: FSLogSeekOptions): boolean {
    const fd = fs.openSync(this.options.path, 'r');
    const stats = fs.statSync(this.options.path);
    const fileSize = stats.size;
    let position = fileSize;
    const BUFFER_SIZE = 1024;
    let lines: string[] = [];
    let found = false;

    // Read the file backwards in chunks
    while (position > 0 && !found) {
      position = Math.max(0, position - BUFFER_SIZE);

      // Adjust position to ensure we start reading at the beginning of a line
      let adjustment = 0;
      while (position > 0 && adjustment < BUFFER_SIZE) {
        const peekByte = Buffer.alloc(1);
        fs.readSync(fd, peekByte, 0, 1, position - 1);
        if (peekByte.toString('utf8') === '\n') {
          break;
        }
        position--;
        adjustment++;
      }

      // now we have only full records at the beginning
      // we need to get to the next ending newline
      let chunk = '';
      let endsWithNewline = false;
      let byteOffset = 0;

      const seekNewline = (byteOffset: number) => {
        let buffer = Buffer.alloc(BUFFER_SIZE + byteOffset);
        const bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE + byteOffset, position);
        chunk = buffer.toString('utf8', 0, bytesRead);
        return chunk.endsWith('\n');
      }

      while (!endsWithNewline) {
        endsWithNewline = seekNewline(++byteOffset);
      }

      // Prepend any previously read text that might contain the end of a line
      const chunkLines = chunk.split('\n') .filter(line => line.length > 0);

      lines = [...chunkLines, ...lines];
      // Check each line in reverse to find the sequence number
      for (let i = chunkLines.length - 1; i >= 0; i--) {
        const lineSeqNum = parseInt(chunkLines[i].split(' ')[0], 10);
        if (!isNaN(lineSeqNum) && lineSeqNum <= offset) {
          found = true;

          // pull off records form the current chunk
          // up to the specified offset
          while (Number(lines[0].split(' ')[0]) < offset) {
            lines.shift();
          }

          break;
        }
      }
    }

    fs.closeSync(fd);

    if (found) {
      // fill up LL with lines
      for (const line of lines) {
        const [seq] = line.split(' ');
        this.highestSequenceNumber = Math.max(
          Number(seq),
          this.highestSequenceNumber,
        );
        this.buffer.add(Number(seq), line);
      }
    }

    return found;
  }
}
