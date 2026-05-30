// `rename`: rename an exported identifier across the whole project. The TS
// Language Service rename (ts-morph's Node#rename) rewrites the declaration,
// every importer's binding, and every usage in one pass — and already keeps
// an importer's local alias intact (`{from as x}` → `{to as x}`). After the
// rename, the touched files' import blocks are re-sorted (organizeImports)
// using the project's surveyed style; files that don't reference the symbol
// are never touched.
//
// Scope: named exports. Converting default <-> named export is a separate
// concern and out of scope here. On a name collision (an importer already
// has a top-level `to`) we refuse rather than emit shadowed/broken code;
// auto-aliasing on collision is left for a follow-up.

import {Node, type Identifier, type Project, type SourceFile} from "ts-morph"
import type * as declared from "ts-refine"

import {displayPath} from "../lib/source-files.ts"
import {organizeChangedImports} from "../recommend/organize-changed.ts"

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export const refineRename: typeof declared.refineRename = async (project, opts) => {
    const {from, to, file, dryRun, report} = opts

    if (!IDENT.test(from)) throw new Error(`rename: not a valid identifier: ${from}`)
    if (!IDENT.test(to)) throw new Error(`rename: not a valid identifier: ${to}`)
    if (from === to) throw new Error("rename: --from and --to are the same")

    const nameNode = resolveExportedName(project, from, file)

    // Reference locations cover the declaration, importer bindings, and
    // usages — the exact set of files the rename will edit.
    const refs = nameNode.findReferencesAsNodes()
    const targetFiles = new Set<SourceFile>([nameNode.getSourceFile()])
    for (const r of refs) targetFiles.add(r.getSourceFile())

    // Collision guard: if any file the rename would edit already declares a
    // top-level `to`, the rename would shadow or redeclare it. Refuse.
    const collisions = [...targetFiles].filter((sf) => fileDeclaresTopLevel(sf, to))
    if (collisions.length > 0) {
        const where = collisions.map((sf) => displayPath(sf.getFilePath())).join(", ")
        throw new Error(`rename: \`${to}\` already exists in: ${where} (aliasing on collision is not supported yet)`)
    }

    nameNode.rename(to)

    // Re-sort imports in every file the rename edited, so a changed import
    // binding leaves a tidy, conventionally-ordered block (#183).
    organizeChangedImports(targetFiles, report)

    const touched = [...targetFiles]
    if (dryRun) {
        for (const sf of touched) console.log(`would update: ${displayPath(sf.getFilePath())}`)
    } else {
        for (const sf of touched) await sf.save()
    }

    const verb = dryRun ? "would rename" : "renamed"
    console.error(`rename: ${verb} ${from} -> ${to} in ${touched.length} file${touched.length === 1 ? "" : "s"}`)

    return {from, to, touched: touched.map((sf) => sf.getFilePath())}
}

// Locate the renameable name node for the exported identifier `from`.
// With a file given, restrict to that file's exports (form ②); otherwise
// the symbol must be uniquely exported across the project (form ①) — zero
// or multiple distinct declarations are an error.
function resolveExportedName(project: Project, from: string, file: string | null): Identifier {
    if (file) {
        const sf = project.getSourceFile(file)
        if (!sf) throw new Error(`rename: not in the project: ${file}`)
        const decls = sf.getExportedDeclarations().get(from)
        if (!decls || decls.length === 0) {
            throw new Error(`rename: ${displayPath(file)} does not export: ${from}`)
        }
        return nameIdentifier(decls[0], from)
    }

    // Project-wide: collect distinct declarations exported under `from`.
    const found = new Set<Node>()
    for (const sf of project.getSourceFiles()) {
        const decls = sf.getExportedDeclarations().get(from)
        if (decls) for (const d of decls) found.add(d)
    }
    if (found.size === 0) throw new Error(`rename: no exported identifier named: ${from}`)
    if (found.size > 1) {
        throw new Error(`rename: \`${from}\` is exported from multiple places; pass the defining file to disambiguate`)
    }
    return nameIdentifier([...found][0], from)
}

// Pull the renameable Identifier out of an exported declaration. Default
// exports and expression exports have no rename target here (out of scope).
function nameIdentifier(decl: Node, from: string): Identifier {
    const nameNode = (decl as {getNameNode?: () => Node | undefined}).getNameNode?.()
    if (nameNode && Node.isIdentifier(nameNode)) return nameNode
    throw new Error(`rename: cannot rename \`${from}\` (unsupported export form; default/expression exports are out of scope)`)
}

// True when the file declares `name` at module top level (function, class,
// interface, type alias, enum, top-level variable, or an import binding).
// Used only for the collision guard, so a broad check that errs toward
// refusing is acceptable.
function fileDeclaresTopLevel(sf: SourceFile, name: string): boolean {
    for (const f of sf.getFunctions()) if (f.getName() === name) return true
    for (const c of sf.getClasses()) if (c.getName() === name) return true
    for (const i of sf.getInterfaces()) if (i.getName() === name) return true
    for (const t of sf.getTypeAliases()) if (t.getName() === name) return true
    for (const e of sf.getEnums()) if (e.getName() === name) return true
    for (const vs of sf.getVariableStatements()) {
        for (const v of vs.getDeclarations()) if (v.getName() === name) return true
    }
    for (const imp of sf.getImportDeclarations()) {
        const clause = imp.getImportClause()
        if (!clause) continue
        if (clause.getDefaultImport()?.getText() === name) return true
        const named = clause.getNamedBindings()
        if (!named) continue
        if (Node.isNamespaceImport(named) && named.getNameNode().getText() === name) return true
        if (Node.isNamedImports(named)) {
            for (const el of named.getElements()) {
                const local = el.getAliasNode()?.getText() ?? el.getNameNode().getText()
                if (local === name) return true
            }
        }
    }
    return false
}
