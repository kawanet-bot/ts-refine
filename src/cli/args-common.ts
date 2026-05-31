// Shared pieces of the CLI argument grammar. parseArgs (in parse-args.ts)
// only resolves the globals and the subcommand; it returns CommonArgs with the
// leftover tokens in `rest`, and the per-command parser in
// src/cli/<command>/<command>-args.ts turns those into its own typed args.

import path from "node:path"

// Result of the common pass: the chosen subcommand verbatim (validated against
// the command table by the caller, not here), the globals, and the still-
// unparsed tokens to its right. The per-command parser consumes `rest`.
export interface CommonArgs {
    command: string
    tsconfigPath: string | null
    dryRun: boolean
    rest: string[]
}

export interface HelpRequested {
    help: true
}

export type ParseArgsResult = CommonArgs | HelpRequested

// Global options collected position-independently, plus the leftover tokens
// (the subcommand and its own arguments, in order).
export interface Globals {
    tsconfigPath: string | null
    dryRun: boolean
    rest: string[]
}

// The slice of the globals a per-command parser needs: the raw tsconfig path
// (resolved per command via resolvePaths) and the dry-run flag.
export type CommandGlobals = Pick<Globals, "tsconfigPath" | "dryRun">

// Pulls the global options out of argv regardless of position, leaving the
// subcommand and its own args in `rest`. `-p` given more than once (on
// either side) is an error; `--dry-run` repeated is idempotent. So the
// three duplicate shapes — left+left, left+right, right+right — behave
// identically, which is the whole point of treating these as positionless.
export function extractGlobals(argv: string[]): Globals | undefined {
    let tsconfigPath: string | null = null
    let dryRun = false
    const rest: string[] = []

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a === "-p" || a === "--project") {
            const v = argv[++i]
            if (!v || v.startsWith("-")) {
                console.error(`${a} requires a path (e.g. ${a} tsconfig.json)`)
                return undefined
            }
            if (tsconfigPath !== null) {
                console.error(`${a} cannot be combined with another tsconfig path`)
                return undefined
            }
            tsconfigPath = v
        } else if (a === "--dry-run") {
            dryRun = true
        } else {
            rest.push(a)
        }
    }

    return {tsconfigPath, dryRun, rest}
}

// Resolve the tsconfig path and the positional files. Files are resolved
// against the tsconfig dir (not cwd) so the target set doesn't shift with
// the working directory — same basis the removed --include used. A
// trailing `/` on the input survives the resolve (move uses it as a
// "this is a directory" hint).
export function resolvePaths(tsconfigPath: string | null, files: string[]): {absTsconfig: string; paths: string[]} {
    const absTsconfig = resolveTsconfigPath(tsconfigPath ?? ".")
    const tsconfigDir = path.dirname(absTsconfig)
    const paths = files.map((g) => {
        const absolute = path.isAbsolute(g) ? g : path.resolve(tsconfigDir, g)
        return g.endsWith("/") || g.endsWith(path.sep) ? absolute + path.sep : absolute
    })
    return {absTsconfig, paths}
}

// Mirrors `tsc -p`: a non-`.json` value is treated as a directory and
// `tsconfig.json` is appended.
function resolveTsconfigPath(input: string): string {
    const absolute = path.resolve(input)
    if (input.endsWith(".json")) return absolute
    return path.join(absolute, "tsconfig.json")
}
