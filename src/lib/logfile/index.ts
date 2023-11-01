export * from './Log';

export enum LogEvents {
  WRITE_FLUSH = 'write:flush',
  READ_LINE = 'read:line',
}

export interface Log {
  append(line: string): Promise<void>;
  read(predicate?: (line: string) => boolean): string[];
}

export interface LogOptions {
  // The path to the logfile
  path: string;
  // The maximum size of the logfile in bytes
  maxsize?: number;
  // The maximum number of logfiles to keep
  maxfiles?: number;
  // Whether or not to compress the logfiles
  compress?: boolean;
  // Flush writes after number of bytes
  flushAfter?: number;
}
