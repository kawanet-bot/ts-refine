// --report member-separators: classify each interface / class member by
// its trailing punctuation (`;`, `,`, or none / newline-only), then bucket
// files by the primary style they use. Body-bearing members (methods,
// accessors, constructors) end with `}` and are skipped because the choice
// isn't theirs to make.
//
// Prettier mapping (for context):
//   - `semi: true`                              → `;`
//   - `semi: false` + `trailingComma: "all"`    → `,`
//   - `semi: false` + `trailingComma: "none"`   → none (newline only)
// `semi` is the first-level control; `trailingComma` only matters when
// `semi: false`.

import {Node} from "ts-morph"
import type {Project} from "ts-morph"

import {writeRecommendation} from "../lib/recommendation.ts"
import {displayPath, selectSourceFiles} from "../lib/source-files.ts"
import type {ReportOpts} from "../lib/types.ts"

type Separator = "none" | "," | ";"

// Display order is fixed (none / , / ;) so the table layout is stable
// regardless of which buckets happen to be populated.
const DISPLAY_ORDER: Separator[] = ["none", ",", ";"]

const SEP_LABEL: Record<Separator, string> = {
    none: "`\\n`",
    ",": "`,`",
    ";": "`;`",
}

const SEP_FLAG_VALUE: Record<Separator, string> = {
    none: "none",
    ",": "comma",
    ";": "semi",
}

type Bucket = {lines: number; files: number; topPath: string; topLines: number}

export async function runReportMemberSeparators(project: Project, {stream, absIncludes, absExcludes}: ReportOpts): Promise<void> {
    const sourceFiles = selectSourceFiles(project, {absIncludes, absExcludes}).filter((sf) => !sf.getFilePath().endsWith(".d.ts"))

    type PerFile = {path: string; counts: Map<Separator, number>; primary: Separator}
    const perFile: PerFile[] = []

    for (const sf of sourceFiles) {
        const counts = new Map<Separator, number>()
        sf.forEachDescendant((node) => {
            if (!Node.isInterfaceDeclaration(node) && !Node.isClassDeclaration(node)) return
            for (const member of node.getMembers()) {
                const kind = classify(member.getText())
                if (kind === null) continue
                counts.set(kind, (counts.get(kind) ?? 0) + 1)
            }
        })
        if (counts.size === 0) continue
        perFile.push({path: displayPath(sf.getFilePath()), counts, primary: pickPrimary(counts)})
    }

    const buckets = new Map<Separator, Bucket>()
    for (const f of perFile) {
        const linesAtPrimary = f.counts.get(f.primary) ?? 0
        let b = buckets.get(f.primary)
        if (!b) {
            b = {lines: 0, files: 0, topPath: f.path, topLines: 0}
            buckets.set(f.primary, b)
        }
        b.lines += linesAtPrimary
        b.files++
        if (linesAtPrimary > b.topLines || (linesAtPrimary === b.topLines && f.path.localeCompare(b.topPath) < 0)) {
            b.topPath = f.path
            b.topLines = linesAtPrimary
        }
    }

    // Recommendation: file-count majority among the primary buckets.
    let recommendSep: Separator | undefined
    let maxFiles = 0
    for (const s of DISPLAY_ORDER) {
        const fc = buckets.get(s)?.files ?? 0
        if (fc > maxFiles) {
            maxFiles = fc
            recommendSep = s
        } else if (fc === maxFiles && fc > 0 && recommendSep !== s) {
            recommendSep = undefined
        }
    }

    const totalLines = [...buckets.values()].reduce((s, b) => s + b.lines, 0)

    stream.write("### member-separators\n")
    stream.write("\n")
    stream.write("| separator | lines | files | example |\n")
    stream.write("| --- | --- | --- | --- |\n")
    for (const s of DISPLAY_ORDER) {
        const b = buckets.get(s)
        if (!b) continue
        stream.write(`| ${SEP_LABEL[s]} | ${b.lines} | ${b.files} | ${b.topPath} |\n`)
    }
    stream.write(`| total | ${totalLines} | ${perFile.length} | |\n`)
    stream.write("\n")
    if (recommendSep !== undefined) {
        writeRecommendation(stream, `--member-separator ${SEP_FLAG_VALUE[recommendSep]}`)
        stream.write("\n")
    }
    console.error(`report member-separators: ${perFile.length} files counted / ${sourceFiles.length} files total`)
}

// Reads the member's source text and returns the trailing separator, or
// null when the member ends with `}` (a method body, accessor, or
// constructor — no separator choice to record).
function classify(memberText: string): Separator | null {
    const last = memberText.trimEnd().slice(-1)
    if (last === ";") return ";"
    if (last === ",") return ","
    if (last === "}") return null
    return "none"
}

// Primary = bucket with the highest count in this file. Ties follow the
// display order (none > , > ;) so the report stays deterministic — the
// "lowest-ceremony" style wins a tie.
function pickPrimary(counts: Map<Separator, number>): Separator {
    let best: Separator = "none"
    let bestCount = -1
    for (const s of DISPLAY_ORDER) {
        const c = counts.get(s) ?? 0
        if (c > bestCount) {
            bestCount = c
            best = s
        }
    }
    return best
}
