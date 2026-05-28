// CLI help text. Returned as a string so the caller (cli.ts) can decide
// whether to write it to stdout (--help) or stderr (after an argv error).
// `reportNames` / `formatNames` are pulled from their respective registry
// files so help stays in sync with whatever names are wired up.

import {formatNames} from "../format/run-format.ts"
import {reportNames} from "../report/report-names.ts"

export function usage(): string {
    return [
        "Usage: ts-survey [--report <names>|--fix] [-p tsconfig.json] [options]",
        "",
        "Reports (read; the primary mode):",
        "  (no args)                   Run every report and print the survey Markdown",
        "  --report <names>            Emit Markdown for the named reports (comma-separated or repeat)",
        `                              Known reports: ${reportNames.join(", ")}`,
        "  --format <name>             Suppress Markdown and emit the named format instead",
        `                              Known formats: ${formatNames.join(", ")}`,
        "",
        "Fix (write; applies the reports' recommendations to disk):",
        "  --fix                       Apply the recommended settings to every file",
        "  --indent <N>                Override indent width (implies --fix)",
        "  --semicolons on|off         Override semicolon insertion (implies --fix)",
        "  --new-line lf|crlf          Override end-of-line (implies --fix)",
        "  --bracket-spacing on|off    Override inner-brace spacing (implies --fix)",
        "  --organize-imports on|off   Toggle organize-imports under --fix (default: on)",
        "",
        "Project (mirrors `tsc -p`):",
        "  -p, --project <path>        Path to a tsconfig.json or a directory",
        "                              that contains one. Defaults to `-p .`.",
        "",
        "File scope (applies to both):",
        "  --include <glob>            Restrict to files matching the glob",
        "  --exclude <glob>            Skip files matching the glob",
        "",
        "Common:",
        "  --dry-run                   Fix only: print paths instead of writing",
        "  -h, --help                  Show this help",
    ].join("\n")
}
