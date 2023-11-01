export * from './Log';

export interface LogfileReadOptions {
  from?: number;
  lines?: number;
  offset?: number;
}

export interface Log {
  tombstone(ids: number[]): Promise<void>;
  append(lines: string[]): Promise<void>;
  read(options: LogfileReadOptions): Promise<string[]>;
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
