// --report semicolons: per-file trailing-`;` ratio across ASI-eligible
// statements, bucketed in 10% increments. Helps decide which direction
// minimizes churn when standardizing on insert or remove.

import type {Project} from "ts-morph"

import type {RunSemicolonsOpts} from "../action/semicolons.ts"
import {writeRecommendation} from "../lib/recommendation.ts"
import {displayPath, selectSourceFiles} from "../lib/source-files.ts"
import {isSemiEligibleStatement} from "../lib/statement-kinds.ts"
import type {ReportOpts} from "../lib/types.ts"

// Fixed 7-row layout: 0% / 100% / exact-50% match by equality, "1-10%" and
// "90-99%" are the near-boundary tails, and the two middle buckets fill the
// remaining gap on either side of 50%. The earlier 10%-stepped layout was
// too sparse to be useful — every middle bucket was empty for typical files.
const BUCKETS: {label: string; test: (p: number) => boolean}[] = [
    {label: "0%", test: (p) => p === 0},
    {label: "1-10%", test: (p) => p > 0 && p <= 10},
    {label: "11-49%", test: (p) => p > 10 && p < 50},
    {label: "50%", test: (p) => p === 50},
    {label: "51-89%", test: (p) => p > 50 && p < 90},
    {label: "90-99%", test: (p) => p >= 90 && p < 100},
    {label: "100%", test: (p) => p === 100},
]

export async function runReportSemicolons(project: Project, {stream, absIncludes, absExcludes}: ReportOpts): Promise<Partial<RunSemicolonsOpts>> {
    const sourceFiles = selectSourceFiles(project, {absIncludes, absExcludes}).filter((sf) => !sf.getFilePath().endsWith(".d.ts"))

    type PerFile = {path: string; total: number; withSemi: number; percent: number}
    const perFile: PerFile[] = []

    for (const sf of sourceFiles) {
        let total = 0
        let withSemi = 0
        sf.forEachDescendant((node) => {
            if (!isSemiEligibleStatement(node)) return
            total++
            if (node.getText().endsWith(";")) withSemi++
        })
        if (total === 0) continue
        perFile.push({
            path: displayPath(sf.getFilePath()),
            total,
            withSemi,
            percent: (withSemi / total) * 100,
        })
    }

    const bucketFiles: PerFile[][] = BUCKETS.map((): PerFile[] => [])
    for (const f of perFile) {
        const idx = BUCKETS.findIndex((b) => b.test(f.percent))
        bucketFiles[idx].push(f)
    }

    // Recommend based on file counts strictly below vs strictly above 50%,
    // so the minority-style files are the ones that get rewritten. Files at
    // exactly 50% are ambiguous and excluded from the comparison.
    const below = perFile.filter((f) => f.percent < 50).length
    const above = perFile.filter((f) => f.percent > 50).length
    const recommendMode: "remove" | "insert" | undefined = below > above ? "remove" : above > below ? "insert" : undefined
    const recommendFlag = recommendMode === "remove" ? "--remove-semicolons" : recommendMode === "insert" ? "--insert-semicolons" : undefined

    stream.write("### semicolons\n")
    stream.write("\n")
    stream.write("| trailing `;` | files | example |\n")
    stream.write("| --- | --- | --- |\n")
    for (let i = 0; i < BUCKETS.length; i++) {
        const files = bucketFiles[i]
        if (files.length === 0) {
            stream.write(`| ${BUCKETS[i].label} | 0 ||\n`)
        } else {
            // The example column shows the file with the largest statement count
            // in the bucket; ties resolved lexicographically by path.
            const example = files.slice().sort((a, b) => b.total - a.total || a.path.localeCompare(b.path))[0]
            stream.write(`| ${BUCKETS[i].label} | ${files.length} | ${example.path} |\n`)
        }
    }
    stream.write(`| total | ${perFile.length} | |\n`)
    stream.write("\n")
    if (recommendFlag) {
        writeRecommendation(stream, recommendFlag)
        stream.write("\n")
    }
    console.error(`report semicolons: ${perFile.length} files counted / ${sourceFiles.length} files total`)
    return recommendMode ? {mode: recommendMode} : {}
}
