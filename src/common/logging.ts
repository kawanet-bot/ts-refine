// Progress/diagnostic line sink shared by the refine* and report functions.
// With no `log` (the default) lines go to console.warn; a provided Writer takes
// them with a single trailing newline. Callers pass the line without a trailing
// newline so both paths stay consistent.

import type {TSR} from "ts-refine"

// A Writer that discards everything. Used where a sink is required but the
// output is intentionally dropped (e.g. surveying for settings without
// emitting the report Markdown). Shared by CLI and library code.
export const NULL_SINK: TSR.Writer = {write: () => {}}

export const logging = (log: TSR.Writer | undefined, line: string): void => {
    line = line.trim()
    if (log) {
        log.write(line + "\n")
    } else {
        console.warn(line)
    }
}
