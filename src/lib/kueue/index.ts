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
  persistence: {
    enabled: boolean;
    path: string;
  };
}

export interface Message {
  id: string;
  tombstone?: boolean;
  data?: string | Record<string, unknown>;
  meta?: Record<string, unknown>;
}
