export * from './AppendOnly';

export interface AofOptions {
  tombstoneToken?: string;
}

export interface AofReadOptions {
  // the sequence number to start the read from
  from?: number;
  // The number of lines to read
  lines?: number;
  // The offset to start reading from
  offset?: number;
}

export interface AofWriteOptions {
  seq?: number;
  id: string;
  data: string;
  meta?: string;
}
