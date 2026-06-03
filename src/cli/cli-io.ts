// CLI I/O plumbing: the Context box every command runner receives.

import type {TSR} from "ts-refine"
import type {CommonArgs} from "./parse-common-args.ts"

// The whole CLI as a function: parse the leading globals out of `ctx.tokens`
// into `ctx.args`, dispatch the subcommand writing stdout-bound output to
// `ctx.output`, and resolve with 0 on success, or reject with an Error for the
// caller to display.
export type CLI = (ctx: Context) => Promise<number>

// The single box refineCLI hands to each command: the parsed global args, the
// command's own remaining tokens, the stdout-bound stream, and the log sink for
// progress/diagnostics. refineCLI itself takes the same shape with the full
// token list and an empty `args` to fill.
export interface Context {
    args: CommonArgs
    tokens: string[]
    output: TSR.Writer
    log: TSR.Writer
}
