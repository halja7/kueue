import { EventEmitter } from 'node:events';
import { LogOptions, LogEvents, LogRecord, Log } from '.';
import { LinkedList } from './LinkedList';

export class MemLog extends EventEmitter implements Log {
  private buffer = new LinkedList<string>();
  private highestSequenceNumber = 0;

  constructor(private options: LogOptions) {
    super();
  }

  private isOpen() {
    return !(this.buffer.size() > this.options.bufferSize);
  }

  size() {
    return this.buffer.size();
  }

  next(): LogRecord | null {
    const current = this.buffer.head;
    if (!current) return null;

    return {
      data: current.data,
      commitOffset: () => {
        this.buffer.remove(current.seq);
        return { offset: current.seq, error: null };
      }
    };
  }

  async append(lines: string[]): Promise<boolean> {
    if (!this.isOpen()) {
      return false;
    }

    for (const line of lines) {
      const seq = this.highestSequenceNumber++;
      this.buffer.add(seq, `${seq} ${line}`);
    }

    this.emit(LogEvents.WRITE_FLUSH);


    return true;
  }

  /**
   * Returns all records in buffer with 
   * mechanism to commit offset and shift the buffer
   */
  read(): LogRecord[] {
    const data = this.buffer.map(line => {
      const [seq] = line.split(' ');
      const commitOffset = () => {
        try {
          this.buffer.remove(Number(seq));
          return { offset: Number(seq), error: null };
        } catch(err: unknown) {
          return { 
            offset: Number(seq), 
            error: err instanceof Error ? err : new Error('Unknown error')
          };
        }
      };

      return { data: line, commitOffset: commitOffset.bind(this) };
    });

    return data;
  }
}
