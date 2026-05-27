// Minimal sink contract used by report writers. Avoids pulling in the full
// node:stream Writable type when only a per-line write is needed.
export type Writer = { write: (line: string) => void }
