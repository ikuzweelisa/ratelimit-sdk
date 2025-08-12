/**
 * This module contains utility functions like a local KV store.
 * @packageDocumentation
 */
import { LocalKV } from "./localKv";


/**
 * Create a new local KV store.
 * @returns A new instance of the LocalKV class.
 */
const createLocalKv: () => LocalKV = () => new LocalKV();
export { createLocalKv, LocalKV };
