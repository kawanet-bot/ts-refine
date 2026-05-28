// Shared option shapes used by every public entry. Kept in one place so a
// new top-level option (e.g. another scoping knob alongside absIncludes /
// absExcludes) only needs to grow this base interface; the action and
// report Opts inherit it.
//
// Not re-exported from the package's public types — consumers reach the
// fields through the leaf Opts interfaces (RunOrganizeImportsOpts, etc.)
// rather than naming the base directly.

import type {Writer} from "./writable.ts"

export interface TsSurveyOpts {
    absIncludes: string[]
    absExcludes: string[]
}

export interface ReportOpts extends TsSurveyOpts {
    stream: Writer
}
