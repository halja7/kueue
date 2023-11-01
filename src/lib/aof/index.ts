export * from "./Aof"
import { Log } from "../logfile"

export interface AofOptions {
    // The path to the logfile
    path: string;
    // Log interface
    log: Log,
    // The maximum size of the logfile in bytes
    maxsize?: number,
    // The maximum number of logfiles to keep
    maxfiles?: number,
    // Whether or not to compress the logfiles
    compress?: boolean,
}

export interface AofReadOptions {
  // the sequence number to start the read from
  from?: number,
  // The number of lines to read
  lines?: number,
  // The offset to start reading from
  offset?: number,
}

export interface AofWriteOptions {
  seq?: number,
  id: number,
  data: string,
  meta?: string,
}
