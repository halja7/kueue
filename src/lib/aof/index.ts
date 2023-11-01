export * from './AppendOnly';

export interface AofReadOptions {
  // the sequence number to start the read from
  from?: number;
  // The number of lines to read
  lines?: number;
  // The offset to start reading from
  offset?: number;
}

export interface AofWriteOptions {
  id: string;
  tombstone?: boolean;
  data?: string | Record<string, unknown>;
  meta?: Record<string, unknown>;
}
