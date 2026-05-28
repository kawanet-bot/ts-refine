// CLI argument parsing. The entry point is the only place that reads
// process.argv; this module receives the slice as input.
//
// Two operating modes:
//   report (read):  the default. Walk the project, emit Markdown.
//                   Switches: --report <names>, --format <name>.
//   fix (write):    apply the report's recommendations to disk via the
//                   Language Service formatter and organizeImports.
//                   Switch: --fix, plus per-field overrides such as
//                   --indent N, --semicolons on|off, --new-line lf|crlf,
//                   --bracket-spacing on|off, --organize-imports on|off.
//
// Implicit-mode rules mirror how an explicit --format implies report
// mode: passing any fix-side flag (override or --fix itself) puts the
// CLI in fix mode even if --fix is omitted. Mixing the two sides is an
// error; the conflict check covers both explicit and implicit triggers.
//
// Defaults reflect the "survey" in the package name: when the user
// supplies neither a report flag nor a fix flag, every known report
// runs. The tsconfig path defaults to ./tsconfig.json (i.e. equivalent
// to `-p .`).
//
// Project path resolution mirrors `tsc -p`: the value is either a
// `.json` file or a directory containing one. A non-`.json` value is
// treated as a directory and `/tsconfig.json` is appended. There is
// no bare-positional shortcut — every non-flag word is rejected so a
// stray argument doesn't get silently misread as a tsconfig path.
//
// Return value semantics (parseArgs never calls process.exit):
//   - ParsedArgs       — normal parse, ready to dispatch
//   - {help: true}     — user asked for --help / -h
//   - undefined        — argv contained an error; a specific error
//                        message has already been written to stderr

import path from "node:path"

import {reportNames as knownReportNames} from "../report/report-names.ts"

// Fix-mode overrides. Each field is independent; an absent field means
// "follow the report's recommendation"; a set field overrides the
// matching slot. `newLine` is narrowed to lf|crlf because the LS
// formatter cannot emit CR-only newlines.
export interface FixOverrides {
    organizeImports?: "on" | "off"
    indent?: number
    semicolons?: "on" | "off"
    newLine?: "lf" | "crlf"
    bracketSpacing?: "on" | "off"
}

export interface ParsedArgs {
    // True when fix mode is active. Set by --fix or by any per-field
    // override (the implicit-fix rule).
    fix: boolean
    fixOverrides: FixOverrides
    reportNames: string[]
    format: string | null
    // True when neither a report flag nor a fix flag was given. The
    // default-survey path uses this to decide whether to append the
    // recommendation / `.prettierrc` summary blocks under the per-report
    // tables.
    surveyDefault: boolean
    tsconfigPath: string
    dryRun: boolean
    absIncludes: string[]
    absExcludes: string[]
}

export interface HelpRequested {
    help: true
}

export type ParseArgsResult = ParsedArgs | HelpRequested

export function parseArgs(argv: string[]): ParseArgsResult | undefined {
    if (argv.includes("--help") || argv.includes("-h")) return {help: true}

    let fixExplicit = false
    const overrides: FixOverrides = {}
    let format: string | null = null
    let tsconfigPath: string | null = null
    let dryRun = false
    const includeGlobs: string[] = []
    const excludeGlobs: string[] = []
    // Report names accumulate in input order with de-duplication. Both
    // comma-separated values and repeated --report flags are accepted.
    // Whether each name is known is decided by runReports later.
    const requestedReports: string[] = []

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a === "--fix") {
            fixExplicit = true
        } else if (a === "--organize-imports") {
            const v = argv[++i]
            if (v !== "on" && v !== "off") {
                console.error(`--organize-imports expects 'on' or 'off'; got: ${v ?? "(missing)"}`)
                return undefined
            }
            overrides.organizeImports = v
        } else if (a === "--semicolons") {
            const v = argv[++i]
            if (v !== "on" && v !== "off") {
                console.error(`--semicolons expects 'on' or 'off'; got: ${v ?? "(missing)"}`)
                return undefined
            }
            overrides.semicolons = v
        } else if (a === "--indent") {
            const v = argv[++i]
            if (!v || v.startsWith("-")) {
                console.error("--indent requires a positive integer (e.g. --indent 4)")
                return undefined
            }
            const n = Number(v)
            if (!Number.isInteger(n) || n <= 0) {
                console.error(`--indent expects a positive integer; got: ${v}`)
                return undefined
            }
            overrides.indent = n
        } else if (a === "--new-line") {
            // CR-only is reportable but not applicable: the TS LS formatter
            // accepts \n and \r\n only. We reject `cr` here so the user sees
            // a clear error instead of a silent fallback.
            const v = argv[++i]
            if (v !== "lf" && v !== "crlf") {
                console.error(`--new-line expects 'lf' or 'crlf'; got: ${v ?? "(missing)"}`)
                return undefined
            }
            overrides.newLine = v
        } else if (a === "--bracket-spacing") {
            const v = argv[++i]
            if (v !== "on" && v !== "off") {
                console.error(`--bracket-spacing expects 'on' or 'off'; got: ${v ?? "(missing)"}`)
                return undefined
            }
            overrides.bracketSpacing = v
        } else if (a === "--report") {
            const v = argv[++i]
            if (!v || v.startsWith("-")) {
                console.error("--report requires a report name (e.g. --report unused-exports)")
                return undefined
            }
            for (const name of v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)) {
                if (!requestedReports.includes(name)) requestedReports.push(name)
            }
        } else if (a === "--dry-run") {
            dryRun = true
        } else if (a === "--format") {
            const v = argv[++i]
            if (!v || v.startsWith("-")) {
                console.error("--format requires a value (e.g. --format prettier)")
                return undefined
            }
            // Whether the name is known is decided by selectFormat later
            // (mirroring how --report names are validated by runReports).
            format = v
        } else if (a === "--include") {
            const v = takeGlobValue(argv, ++i, "--include")
            if (v === undefined) return undefined
            includeGlobs.push(v)
        } else if (a === "--exclude") {
            const v = takeGlobValue(argv, ++i, "--exclude")
            if (v === undefined) return undefined
            excludeGlobs.push(v)
        } else if (a === "-p" || a === "--project") {
            const v = argv[++i]
            if (!v || v.startsWith("-")) {
                console.error(`${a} requires a path (e.g. ${a} tsconfig.json)`)
                return undefined
            }
            if (tsconfigPath) {
                console.error(`${a} cannot be combined with another tsconfig path`)
                return undefined
            }
            tsconfigPath = v
        } else if (a.startsWith("-")) {
            console.error(`unknown option: ${a}`)
            return undefined
        } else {
            // The tsconfig path goes through -p / --project; bare words
            // are rejected outright so a misspelt flag or stray arg can't
            // silently override the project path.
            console.error(`unexpected argument: ${a} (use -p / --project to set the tsconfig path)`)
            return undefined
        }
    }

    // Validate flag combinations before checking inputs to give actionable errors.
    const hasOverride = Object.keys(overrides).length > 0
    const fix = fixExplicit || hasOverride
    const hasReport = requestedReports.length > 0
    const hasFormat = format !== null
    if (fix && hasReport) {
        console.error("fix flags (--fix and per-field overrides) cannot be combined with --report")
        return undefined
    }
    if (fix && hasFormat) {
        console.error("fix flags (--fix and per-field overrides) cannot be combined with --format")
        return undefined
    }

    // Default: when no fix flag, no --report, and no --format was given,
    // run every registered report. This is the "survey" baseline. The
    // surveyDefault flag tells cli.ts whether to append the recommendation
    // / `.prettierrc` summary blocks.
    const surveyDefault = !fix && !hasReport && !hasFormat
    const effectiveReports = surveyDefault ? [...knownReportNames] : requestedReports

    // Path resolution mirrors `tsc -p`: a non-`.json` value is read as a
    // directory and `tsconfig.json` is appended. The omitted-path default
    // is equivalent to `-p .`. Existence isn't checked here; initProject()
    // surfaces a missing file as a normal throw caught by the CLI.
    const absTsconfig = resolveTsconfigPath(tsconfigPath ?? ".")

    // Resolve include/exclude globs against the tsconfig directory so the same
    // command yields the same target set regardless of cwd.
    const tsconfigDir = path.dirname(absTsconfig)
    const absIncludes = includeGlobs.map((g) => resolveGlob(g, tsconfigDir))
    const absExcludes = excludeGlobs.map((g) => resolveGlob(g, tsconfigDir))

    return {
        fix,
        fixOverrides: overrides,
        reportNames: effectiveReports,
        format,
        surveyDefault,
        tsconfigPath: absTsconfig,
        dryRun,
        absIncludes,
        absExcludes,
    }
}

function takeGlobValue(args: string[], idx: number, optName: string): string | undefined {
    const v = args[idx]
    if (!v || v.startsWith("-")) {
        console.error(`${optName} requires a glob value`)
        return undefined
    }
    return v
}

function resolveGlob(pattern: string, baseDir: string): string {
    if (path.isAbsolute(pattern)) return pattern
    return path.resolve(baseDir, pattern)
}

// Mirrors `tsc -p`: a `.json` value is read as a file path, anything
// else is read as a directory and `tsconfig.json` is appended. This
// makes `-p .` equivalent to the omitted-path default.
function resolveTsconfigPath(input: string): string {
    const absolute = path.resolve(input)
    if (input.endsWith(".json")) return absolute
    return path.join(absolute, "tsconfig.json")
}
