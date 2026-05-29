// `move`: relocate one or more .ts files and update every import path
// that targets them. ts-morph's sf.move() handles the path arithmetic
// for all import forms (value / type / namespace / re-export / dynamic)
// and preserves the surrounding text untouched; what it doesn't do is
// preserve the `.ts` extension in the rewritten module specifiers, so we
// snapshot the original `.ts` presence per specifier before the move and
// restore it after. No format pass runs — sf.move() is format-preserving
// on its own, and any cleanup (organize-imports, etc.) is the user's
// follow-up call to reformat.
//
// Migration ("everyone should use this extension style") is intentionally
// out of scope — that belongs in a separate subcommand. Each specifier
// keeps the extension state it had before the move.

import type * as declared from "@kawanet/ts-survey"
import fs from "node:fs"
import path from "node:path"
import {Node, type ExportDeclaration, type ImportDeclaration, type Project, type SourceFile, type StringLiteral, ts} from "ts-morph"

import {displayPath} from "../lib/source-files.ts"

// One captured module specifier whose target is moving. Held by AST node
// reference so it stays valid across sf.move() and can be patched in place.
type SpecRecord =
    | {kind: "import"; node: ImportDeclaration; hadTsExt: boolean}
    | {kind: "export"; node: ExportDeclaration; hadTsExt: boolean}
    | {kind: "dynamic"; node: StringLiteral; hadTsExt: boolean}

export const runMove: typeof declared.runMove = async (project, opts) => {
    const {sources, dest, dryRun} = opts

    const plan = planMoves(project, sources, dest)

    // Pre-move snapshot: which in-project specifiers target a moving file
    // and whether they currently carry a `.ts` extension.
    const movingPaths = new Set(plan.map((p) => p.from))
    const records = snapshotSpecifiers(project, movingPaths)

    // Apply each move in turn. ts-morph keeps cross-file references in sync
    // — including the moved file's own outgoing relative paths.
    for (const {from, to} of plan) {
        project.getSourceFileOrThrow(from).move(to)
    }

    // Restore `.ts` extensions where they were dropped. Symmetric for the
    // rare flip case (had no `.ts`, now has one).
    for (const r of records) restoreTsExtension(r)

    // Touched = every file whose contents changed: the moved files plus
    // any importer that held a recorded specifier.
    const destPaths = new Set(plan.map((p) => p.to))
    const touchedSet = new Set<string>(destPaths)
    for (const r of records) touchedSet.add(r.node.getSourceFile().getFilePath())

    // Dry-run: print planned moves + the importers that would change;
    // never touch disk. Otherwise let ts-morph persist moves and content
    // updates atomically via project.save().
    if (dryRun) {
        for (const {from, to} of plan) console.log(`would move: ${displayPath(from)} -> ${displayPath(to)}`)
        for (const p of touchedSet) {
            if (!destPaths.has(p)) console.log(`would update: ${displayPath(p)}`)
        }
    } else {
        await project.save()
    }

    const verb = dryRun ? "would move" : "moved"
    console.error(`move: ${verb} ${plan.length} file${plan.length === 1 ? "" : "s"} (${touchedSet.size} touched)`)

    return {
        moves: plan.map(({from, to}) => ({from, to})),
        touched: [...touchedSet],
    }
}

// Resolve sources/dest into a concrete from→to plan. Mirrors `mv`'s rules:
// a directory destination puts each source into it under its basename;
// a file destination only makes sense for a single source. Conflicts
// (duplicate dest, dest === a source) are rejected up-front.
function planMoves(project: Project, sources: string[], dest: string): {from: string; to: string}[] {
    if (sources.length === 0) throw new Error("move: at least one source file is required")

    const destIsDir = isDirectoryDest(dest)
    if (sources.length > 1 && !destIsDir) {
        throw new Error(`move: destination must be an existing directory when moving multiple sources; got: ${dest}`)
    }

    const fromSet = new Set<string>()
    const toSet = new Set<string>()
    const plan: {from: string; to: string}[] = []

    for (const src of sources) {
        if (!project.getSourceFile(src)) {
            throw new Error(`move: not in the project: ${src}`)
        }
        if (fromSet.has(src)) {
            throw new Error(`move: source listed twice: ${src}`)
        }
        fromSet.add(src)

        const to = destIsDir ? path.join(dest, path.basename(src)) : dest
        if (src === to) {
            throw new Error(`move: source and destination are the same: ${src}`)
        }
        if (toSet.has(to)) {
            throw new Error(`move: multiple sources map to the same destination: ${to}`)
        }
        if (fromSet.has(to)) {
            throw new Error(`move: destination overlaps with another source: ${to}`)
        }
        toSet.add(to)
        plan.push({from: src, to})
    }

    return plan
}

// Trailing `/` always means "directory" (UNIX convention). Otherwise look
// at disk: an existing directory is the multi-source case; anything else
// (existing file or not-yet-present path) is the single-source rename.
function isDirectoryDest(dest: string): boolean {
    if (dest.endsWith("/") || dest.endsWith(path.sep)) return true
    try {
        return fs.statSync(dest).isDirectory()
    } catch {
        return false
    }
}

// Walks every project source file (.d.ts excluded) and captures any
// specifier whose target is moving — or any outgoing specifier on a moving
// file itself, since ts-morph rewrites those too when the file relocates.
function snapshotSpecifiers(project: Project, movingPaths: Set<string>): SpecRecord[] {
    const records: SpecRecord[] = []

    for (const sf of project.getSourceFiles()) {
        const filePath = sf.getFilePath()
        if (filePath.endsWith(".d.ts")) continue
        const isMoving = movingPaths.has(filePath)

        for (const decl of sf.getImportDeclarations()) {
            const target = decl.getModuleSpecifierSourceFile()
            if (!target) continue
            if (!isMoving && !movingPaths.has(target.getFilePath())) continue
            records.push({kind: "import", node: decl, hadTsExt: decl.getModuleSpecifierValue().endsWith(".ts")})
        }
        for (const decl of sf.getExportDeclarations()) {
            const specifier = decl.getModuleSpecifierValue()
            if (specifier === undefined) continue
            const target = decl.getModuleSpecifierSourceFile()
            if (!target) continue
            if (!isMoving && !movingPaths.has(target.getFilePath())) continue
            records.push({kind: "export", node: decl, hadTsExt: specifier.endsWith(".ts")})
        }
        for (const call of sf.getDescendantsOfKind(ts.SyntaxKind.CallExpression)) {
            if (call.getExpression().getKindName() !== "ImportKeyword") continue
            const arg = call.getArguments()[0]
            if (!arg || !Node.isStringLiteral(arg)) continue
            const target = resolveDynamicTarget(sf, arg.getLiteralValue(), project)
            if (!target) continue
            if (!isMoving && !movingPaths.has(target.getFilePath())) continue
            records.push({kind: "dynamic", node: arg, hadTsExt: arg.getLiteralValue().endsWith(".ts")})
        }
    }

    return records
}

function restoreTsExtension(r: SpecRecord): void {
    if (r.kind === "import") {
        const spec = r.node.getModuleSpecifierValue()
        if (r.hadTsExt && !spec.endsWith(".ts")) r.node.setModuleSpecifier(spec + ".ts")
    } else if (r.kind === "export") {
        const spec = r.node.getModuleSpecifierValue()
        if (spec === undefined) return
        if (r.hadTsExt && !spec.endsWith(".ts")) r.node.setModuleSpecifier(spec + ".ts")
    } else {
        const val = r.node.getLiteralValue()
        if (r.hadTsExt && !val.endsWith(".ts")) r.node.setLiteralValue(val + ".ts")
    }
}

// Resolve a dynamic import literal to a project SourceFile, trying both
// the literal as-given and with `.ts` appended (the project may write the
// extension or not).
function resolveDynamicTarget(from: SourceFile, specifier: string, project: Project): SourceFile | undefined {
    if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) return undefined
    const baseDir = from.getDirectoryPath()
    const absolute = path.isAbsolute(specifier) ? specifier : path.resolve(baseDir, specifier)
    return project.getSourceFile(absolute) ?? project.getSourceFile(absolute + ".ts")
}
