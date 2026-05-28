// --report indent: bucket every indented line by its leading width
// (count of leading spaces, or "tab"). Each file contributes a line to
// every width it actually uses, so a 2/4/6/8 file shows up in four
// buckets, not just one. The recommendation picks the width with the
// most distinct files (in practice the first-level indent dominates).

import type {Project} from "ts-morph"

import {writeRecommendation} from "../lib/recommendation.ts"
import {displayPath, selectSourceFiles} from "../lib/source-files.ts"
import type {ReportOpts} from "./unused-exports.ts"

type Width = "tab" | number

type Bucket = {lines: number; files: Set<string>; topPath: string; topLines: number}

export async function runReportIndent(project: Project, {stream, absIncludes, absExcludes}: ReportOpts): Promise<void> {
    const sourceFiles = selectSourceFiles(project, {absIncludes, absExcludes}).filter((sf) => !sf.getFilePath().endsWith(".d.ts"))

    // Per-file map: leading width → number of lines in that file at that width.
    type PerFile = {path: string; counts: Map<Width, number>}
    const perFile: PerFile[] = []
    for (const sf of sourceFiles) {
        const counts = countLeadingWidths(sf.getFullText())
        if (counts.size === 0) continue
        perFile.push({path: displayPath(sf.getFilePath()), counts})
    }

    // Aggregate per width: total lines, set of files, and "example" file
    // (the one contributing the most lines at this width; ties broken
    // lexicographically by path).
    const buckets = new Map<Width, Bucket>()
    for (const f of perFile) {
        for (const [width, count] of f.counts) {
            let b = buckets.get(width)
            if (!b) {
                b = {lines: 0, files: new Set(), topPath: f.path, topLines: 0}
                buckets.set(width, b)
            }
            b.lines += count
            b.files.add(f.path)
            if (count > b.topLines || (count === b.topLines && f.path.localeCompare(b.topPath) < 0)) {
                b.topPath = f.path
                b.topLines = count
            }
        }
    }

    // Numeric widths ascending, then "tab" last.
    const widths: Width[] = []
    const numerics = [...buckets.keys()].filter((k): k is number => typeof k === "number").sort((a, b) => a - b)
    widths.push(...numerics)
    if (buckets.has("tab")) widths.push("tab")

    // Recommendation: width with the most distinct files. Strict ties produce
    // no recommendation (the choice would be arbitrary).
    let recommendWidth: Width | undefined
    let maxFiles = 0
    for (const w of widths) {
        const fc = buckets.get(w)!.files.size
        if (fc > maxFiles) {
            maxFiles = fc
            recommendWidth = w
        } else if (fc === maxFiles && w !== recommendWidth) {
            recommendWidth = undefined
        }
    }

    const totalLines = [...buckets.values()].reduce((s, b) => s + b.lines, 0)

    stream.write("### indent\n")
    stream.write("\n")
    stream.write("| indent | lines | files | example |\n")
    stream.write("| --- | --- | --- | --- |\n")
    for (const w of widths) {
        const b = buckets.get(w)!
        stream.write(`| ${w} | ${b.lines} | ${b.files.size} | ${b.topPath} |\n`)
    }
    stream.write(`| total | ${totalLines} | ${perFile.length} | |\n`)
    stream.write("\n")
    if (recommendWidth !== undefined) {
        const flag = recommendWidth === "tab" ? "--indent tab" : `--indent ${recommendWidth}`
        writeRecommendation(stream, flag)
        stream.write("\n")
    }
    console.error(`report indent: ${perFile.length} files counted / ${sourceFiles.length} files total`)
}

// Counts leading whitespace widths line by line. Empty / all-whitespace lines
// and JSDoc continuation (` * ...`) lines are excluded so they don't
// pollute the buckets.
export function countLeadingWidths(text: string): Map<Width, number> {
    const counts = new Map<Width, number>()
    for (const line of text.split("\n")) {
        if (line.length === 0) continue
        const first = line[0]
        if (first === "\t") {
            counts.set("tab", (counts.get("tab") ?? 0) + 1)
            continue
        }
        if (first !== " ") continue
        let n = 0
        while (n < line.length && line[n] === " ") n++
        if (n === line.length) continue
        if (line[n] === "*") continue
        counts.set(n, (counts.get(n) ?? 0) + 1)
    }
    return counts
}
