export * from './FSLog';
export * from './MemLog';

export enum LogEvents {
  WRITE_FLUSH = 'write:flush',
  READ_LINE = 'read:line',
}

export interface LogRecord {
  data: string;
  commitOffset: () => { offset: number; error: Error | null };
}

export interface Log {
  size(): number;
  append(lines: string[]): Promise<boolean>;
  next(): LogRecord | null;
  read(): LogRecord[];
}

export interface LogOptions {
  // The maximum number of messages in the buffer
  bufferSize: number;
  // The path to the logfile
  path?: string;
  // The maximum size of the logfile in bytes
  maxsize?: number;
  // The maximum number of logfiles to keep
  maxfiles?: number;
  // Whether or not to compress the logfiles
  compress?: boolean;
  // Flush writes after number of bytes
  flushAfter?: number;
  // The sequence number from which to start if a
  // logfile corresponding to the log name exists
  fromOffset?: number;
}

export class LogBuffer {}
