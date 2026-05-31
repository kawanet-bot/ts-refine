// refineCLI is the whole CLI as a function: parse argv into the common
// (globals + subcommand) shape, then hand the leftover tokens to the matching
// command in COMMAND_TABLE, which parses its own options and runs. It writes
// stdout-bound output to `stream`, resolves with the process exit status, and
// never calls process.exit or rejects.
//
// Diagnostics and per-command progress stay on console.error / the runners'
// own console output, which already target the process's stderr/stdout.

import type {Project} from "ts-morph"
import {initProject} from "../index.ts"
import type {CommandGlobals} from "./args-common.ts"
import type {CLIStream} from "./cli-io.ts"
import {parseFormat} from "./format/format-args.ts"
import {runFormat} from "./format/format-cli.ts"
import {parseInspect} from "./inspect/inspect-args.ts"
import {runInspect} from "./inspect/inspect-cli.ts"
import {parseList} from "./list/list-args.ts"
import {runList} from "./list/list-cli.ts"
import {parseMove} from "./move/move-args.ts"
import {runMove} from "./move/move-cli.ts"
import {parseArgs} from "./parse-args.ts"
import {parseRename} from "./rename/rename-args.ts"
import {runRename} from "./rename/rename-cli.ts"
import {parseReport} from "./report/report-args.ts"
import {runReport} from "./report/report-cli.ts"
import {usage} from "./usage.ts"

// One table entry per subcommand: parse its own args, then run. defineCommand
// pairs a parser with its runner so each command's arg type is checked end to
// end while the table stays uniform.
interface CommandSpec {
    dispatch(sub: string[], globals: CommandGlobals, stream: CLIStream): Promise<number>
}

function defineCommand<A extends {tsconfigPath: string}>(parse: (sub: string[], globals: CommandGlobals) => A | undefined, run: (project: Project, args: A, stream: CLIStream) => Promise<void>): CommandSpec {
    return {
        async dispatch(sub, globals, stream) {
            const args = parse(sub, globals)
            // The parser already wrote the specific error; add usage for context.
            if (args === undefined) {
                console.error(usage())
                return 1
            }
            // Library throws (missing tsconfig, unknown report name) become a
            // clean non-zero status rather than an unhandled rejection.
            try {
                const project = initProject({tsConfigFilePath: args.tsconfigPath})
                await run(project, args, stream)
                return 0
            } catch (e) {
                console.error(e instanceof Error ? e.message : String(e))
                return 1
            }
        },
    }
}

// The command table is the single source of truth for the set of subcommands:
// membership here is what makes a name valid, so parse-args stays command-
// agnostic. Insertion order also drives the accepted-subcommand error message.
const COMMAND_TABLE = new Map<string, CommandSpec>([
    ["report", defineCommand(parseReport, runReport)],
    ["format", defineCommand(parseFormat, runFormat)],
    ["list", defineCommand(parseList, runList)],
    ["inspect", defineCommand(parseInspect, runInspect)],
    ["move", defineCommand(parseMove, runMove)],
    ["rename", defineCommand(parseRename, runRename)],
])

// Write commands accept --dry-run; the rest reject it as a likely mistake.
const DRY_RUN_COMMANDS: ReadonlySet<string> = new Set(["format", "move", "rename"])

function acceptedSubcommands(): string {
    return [...COMMAND_TABLE.keys(), "help"].join(", ")
}

// The whole CLI as a function: parse `args` (argv minus node/script),
// dispatch the subcommand writing stdout-bound output to `stream`, and
// resolve with the process exit status (0 ok, 1 on error). Never throws.
type refineCLI = (args: string[], stream: CLIStream) => Promise<number>

export const refineCLI: refineCLI = async (args, stream) => {
    const parsed = parseArgs(args)

    // parseArgs returns undefined for argv errors (stderr already written),
    // {help} for the help command, or CommonArgs for normal dispatch.
    if (parsed === undefined) {
        console.error(usage())
        return 1
    }
    if ("help" in parsed) {
        stream.write(usage() + "\n")
        return 0
    }

    const spec = COMMAND_TABLE.get(parsed.command)
    if (spec === undefined) {
        // A leading dash means the user gave an option where the subcommand
        // belongs; otherwise it's just an unrecognized command name.
        if (parsed.command.startsWith("-")) {
            console.error(`expected a subcommand: ${acceptedSubcommands()}`)
        } else {
            console.error(`unknown command: ${parsed.command} (expected: ${acceptedSubcommands()})`)
        }
        console.error(usage())
        return 1
    }

    // --dry-run only means something for the write commands.
    if (parsed.dryRun && !DRY_RUN_COMMANDS.has(parsed.command)) {
        console.error("--dry-run is only valid with format, move, or rename")
        return 1
    }

    return spec.dispatch(parsed.rest, parsed, stream)
}
