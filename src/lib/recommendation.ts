// Writes a single CLI-flag recommendation block after a report's table.
// The block stays grep-able via `^ +--` so a downstream shell can extract
// only the suggested flags, e.g.:
//
//   ts-survey | grep "^ +--"
//   ts-survey | grep "^ +--" | xargs ts-survey   # apply the suggestion
//
// The trailing blank line is the caller's responsibility so adjacent
// sections can be packed or spaced as the report sees fit.

import type {Writer} from "./writable.ts"

export function writeRecommendation(stream: Writer, flag: string): void {
    stream.write("recommendation:\n")
    stream.write(`    ${flag}\n`)
}
