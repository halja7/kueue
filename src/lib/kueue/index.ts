export * from './Kueue';

export interface ReadOptions {
  // the sequence number to start the read from
  from?: number;
  // The number of lines to read
  lines?: number;
  // The offset to start reading from
  offset?: number;
}

export interface KueueOptions {
  // The name of the queue
  name: string;
  // Enable disk persistence
  //  if true, uses FSLog implementation
  //  otherwise uses MemLog (see Log interface)
  persistence?: {
    // enabled by default
    enabled?: boolean;
    dir?: string;
  };
}

export enum KueueEvents {
  UPDATE_OFFSET = 'update:offset',
  LOG_FLUSH = 'log:flush',
}

export interface Message {
  // unique key identifying the message
  key: string;
  // the JSON data
  data: string | Record<string, unknown>;
  // any meta data
  meta?: Record<string, unknown>;
}
