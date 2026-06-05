// Progress/diagnostic line sink shared by the refine* and report functions.
// With no `log` (the default) lines go to console.warn; a provided Writer takes
// them with a single trailing newline. Callers pass the line without a trailing
// newline so both paths stay consistent.

import type {TSR} from "ts-refine"

export const logging = (log: TSR.Writer | undefined, line: string): void => {
    line = line.trim()
    if (log) {
        log.write(line + "\n")
    } else {
        console.warn(line)
    }
}
