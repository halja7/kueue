export * from "./Log"

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
  // path to file
  filename: string;
}
