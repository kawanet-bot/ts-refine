// CLI argument parsing. The entry point is the only place that reads
// process.argv; this module receives the slice as input.
//
// Action categories (mirroring the action/ and report/ directories):
//   action (write): --organize-imports / --remove-semicolons / --insert-semicolons
//   report (read) : --report <names>
// Multiple actions can run in one invocation. Reports are exclusive with
// actions. --remove-semicolons and --insert-semicolons are mutually exclusive.
//
// The acceptable set of report names is owned by report/run-reports.ts;
// `parseArgs` only records what the user typed and does not validate the
// names against the registry. Content validation happens inside runReports
// where the registry lives.

import fs from "node:fs/promises"
import path from "node:path"

import {reportNames} from "../report/run-reports.ts"

export type ParsedArgs = {
    organizeImports: boolean
    removeSemicolons: boolean
    insertSemicolons: boolean
    reportNames: string[]
    tsconfigPath: string
    dryRun: boolean
    absIncludes: string[]
    absExcludes: string[]
}

export async function parseArgs(argv: string[]): Promise<ParsedArgs> {
    if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
        usage(argv.length === 0 ? 1 : 0)
    }

    let organizeImports = false
    let removeSemicolons = false
    let insertSemicolons = false
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
        if (a === "--organize-imports") {
            organizeImports = true
        } else if (a === "--remove-semicolons") {
            removeSemicolons = true
        } else if (a === "--insert-semicolons") {
            insertSemicolons = true
        } else if (a === "--report") {
            const v = argv[++i]
            if (!v || v.startsWith("-")) {
                console.error("--report requires a report name (e.g. --report unused-exports)")
                usage(1)
            }
            for (const name of v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)) {
                if (!requestedReports.includes(name)) requestedReports.push(name)
            }
        } else if (a === "--dry-run") {
            dryRun = true
        } else if (a === "--include") {
            includeGlobs.push(takeGlobValue(argv, ++i, "--include"))
        } else if (a === "--exclude") {
            excludeGlobs.push(takeGlobValue(argv, ++i, "--exclude"))
        } else if (a.startsWith("--")) {
            console.error(`unknown option: ${a}`)
            usage(1)
        } else if (!tsconfigPath) {
            tsconfigPath = a
        } else {
            console.error(`extra argument: ${a}`)
            usage(1)
        }
    }

    // Validate flag combinations before checking inputs to give actionable errors.
    if (removeSemicolons && insertSemicolons) {
        console.error("--remove-semicolons and --insert-semicolons are mutually exclusive")
        process.exit(1)
    }
    const hasAction = organizeImports || removeSemicolons || insertSemicolons
    const hasReport = requestedReports.length > 0
    if (hasAction && hasReport) {
        console.error("action flags (--organize-imports / --remove-semicolons / --insert-semicolons) cannot be combined with --report")
        process.exit(1)
    }
    if (!hasAction && !hasReport) {
        console.error("no action specified")
        usage(1)
    }
    if (!tsconfigPath) {
        console.error("missing tsconfig.json path")
        usage(1)
    }

    const absTsconfig = path.resolve(tsconfigPath)
    try {
        await fs.access(absTsconfig)
    } catch {
        console.error(`tsconfig not found: ${absTsconfig}`)
        process.exit(1)
    }

    // Resolve include/exclude globs against the tsconfig directory so the same
    // command yields the same target set regardless of cwd.
    const tsconfigDir = path.dirname(absTsconfig)
    const absIncludes = includeGlobs.map((g) => resolveGlob(g, tsconfigDir))
    const absExcludes = excludeGlobs.map((g) => resolveGlob(g, tsconfigDir))

    return {
        organizeImports,
        removeSemicolons,
        insertSemicolons,
        reportNames: requestedReports,
        tsconfigPath: absTsconfig,
        dryRun,
        absIncludes,
        absExcludes,
    }
}

function takeGlobValue(args: string[], idx: number, optName: string): string {
    const v = args[idx]
    if (!v || v.startsWith("-")) {
        console.error(`${optName} requires a glob value`)
        usage(1)
    }
    return v
}

function resolveGlob(pattern: string, baseDir: string): string {
    if (path.isAbsolute(pattern)) return pattern
    return path.resolve(baseDir, pattern)
}

function usage(code: number): never {
    const out = code === 0 ? console.log : console.error
    out("Usage: ts-survey <action(s)|--report> <tsconfig.json> [options]")
    out("")
    out("Actions (write; multiple can be combined, fixed execution order):")
    out("  --organize-imports          Apply the Language Service organizeImports")
    out("  --remove-semicolons         Strip trailing `;` from all ASI-eligible statements")
    out("  --insert-semicolons         Append trailing `;` to all ASI-eligible statements")
    out("                              (--remove-semicolons and --insert-semicolons are mutually exclusive)")
    out("")
    out("Reports (read; exclusive with actions):")
    out("  --report <names>            Emit Markdown reports (comma-separated or repeat)")
    out("                              Known reports: " + reportNames.join(", "))
    out("")
    out("File scope (applies to both):")
    out("  --include <glob>            Restrict to files matching the glob")
    out("  --exclude <glob>            Skip files matching the glob")
    out("")
    out("Common:")
    out("  --dry-run                   Action only: print paths instead of writing")
    out("  -h, --help                  Show this help")
    process.exit(code)
}
