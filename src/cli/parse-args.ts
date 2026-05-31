// argv → CommonArgs. Subcommand grammar (git-style):
//   ts-refine [global...] <command> [command args...] [global...]
//
// Global options may appear on either side of the subcommand:
//   -p / --project <path>   shared by every command
//   --dry-run               applies to the write commands (format, move, rename)
//   -h / --help             shown anywhere
// Command-specific options (--output, --semicolons, --no-exports, report /
// inspector selectors, ...) stay to the RIGHT of the subcommand.
//
// Like `git`, this common pass only resolves the globals and splits off the
// subcommand verbatim; it does NOT decide whether the subcommand is valid or
// whether --dry-run applies to it. The caller looks the command up in the
// command table and rejects unknown ones. The leftover tokens (`rest`) go to
// the per-command parser in src/cli/<command>/<command>-args.ts.

import {extractGlobals, type ParseArgsResult} from "./args-common.ts"

export function parseArgs(argv: string[]): ParseArgsResult | undefined {
    // `help` is the canonical spelling; -h / --help are aliases that win
    // wherever they appear (a global option, like the rest below).
    if (argv.includes("--help") || argv.includes("-h")) return {help: true}

    const globals = extractGlobals(argv)
    if (globals === undefined) return undefined
    const [command, ...sub] = globals.rest

    if (command === undefined) {
        // Bare invocation is help; globals with no subcommand is a usage error.
        if (globals.tsconfigPath !== null || globals.dryRun) {
            console.error("expected a subcommand")
            return undefined
        }
        return {help: true}
    }
    if (command === "help") return {help: true}

    return {command, tsconfigPath: globals.tsconfigPath, dryRun: globals.dryRun, rest: sub}
}
