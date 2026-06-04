// memberSeparators apply pass. The LS formatter can't set interface / class
// member separators (and can't emit commas at all), so refineFormat runs this
// after formatText to normalize each member's trailing punctuation to the
// chosen style. Scope mirrors the member-separators report: interface and
// class members (body-bearing members carry no separator).
//
// Every rewrite is checked by re-parsing: a proposed separator change is
// applied to a copy of the container and accepted only when the member kinds
// (in order) are unchanged and no new syntax error appears. The parser is the
// oracle, so there is no per-shape heuristic — fusing a bare member into the
// next signature (`foo` + `<T>(): T`), a class field into a computed member
// (`x = foo` + `[y]`), a comma on a class field, or dropping a separator that
// two same-line members still need are all rejected the same way.

import type {ClassMemberTypes, Project, SourceFile, TypeElementTypes} from "ts-morph"
import {Node} from "ts-morph"
import type {TSR} from "ts-refine"
import {initInMemoryProject} from "../common/init-project.ts"
import {isSeparableMember} from "../report/member-separators.ts"

type Member = ClassMemberTypes | TypeElementTypes

// Target trailing separator for each style ("" = none).
const SEPARATOR = {semi: ";", comma: ",", none: ""} as const

// The member node text includes its trailing `;` / `,` (getText covers it),
// so drop a single trailing separator to rebuild from a clean base.
function stripSeparator(text: string): string {
    const t = text.trimEnd()
    return t.endsWith(";") || t.endsWith(",") ? t.slice(0, -1) : t
}

// Re-parse a container body and report what a rewrite must preserve: the member
// kinds in order, plus the syntactic parse-error count. The error count is
// needed because the parser is error-tolerant — dropping a separator between
// two same-line members keeps the member count but raises a parse error.
function survey(scratch: Project, containerText: string): {kinds: string; errors: number} {
    const sf = scratch.createSourceFile("/_probe.ts", containerText, {overwrite: true})
    const container = sf.getInterfaces()[0] ?? sf.getClasses()[0]
    const kinds = container ? container.getMembers().map((m) => m.getKindName()).join(",") : ""
    const errors = (sf.compilerNode as {parseDiagnostics?: unknown[]}).parseDiagnostics?.length ?? 0
    return {kinds, errors}
}

export function applyMemberSeparators(sf: SourceFile, style: TSR.MemberSeparatorsOpts["separator"]): void {
    const want = SEPARATOR[style]

    // The scratch project for the verification re-parses. Built lazily on the
    // first proposed rewrite, so an already-conforming file (the steady state)
    // never creates one; released with this call.
    let scratch: Project | undefined

    // Accepted edits across the whole file, captured as offsets + text. Collected
    // during traversal but applied only afterwards: mutating `sf` mid-walk
    // reparses it and forgets the nodes the traversal is still visiting, which
    // would skip or corrupt later interfaces/classes in the same file.
    const edits: {start: number; end: number; text: string}[] = []

    sf.forEachDescendant((node) => {
        if (!Node.isInterfaceDeclaration(node) && !Node.isClassDeclaration(node)) return
        const text = node.getText()
        const base = node.getStart()
        let before: {kinds: string; errors: number} | undefined

        for (const member of node.getMembers() as Member[]) {
            if (!isSeparableMember(member)) continue
            const replacement = stripSeparator(member.getText()) + want
            if (replacement === member.getText()) continue // already conforms — no rewrite

            // A rewrite is proposed: re-parse the container with only this
            // member's separator changed and accept it only when the structure
            // survives intact.
            scratch ??= initInMemoryProject()
            before ??= survey(scratch, text)
            const candidate = text.slice(0, member.getStart() - base) + replacement + text.slice(member.getEnd() - base)
            const after = survey(scratch, candidate)
            if (after.kinds === before.kinds && after.errors <= before.errors) {
                edits.push({start: member.getStart(), end: member.getEnd(), text: replacement})
            }
        }
    })

    if (edits.length === 0) return

    // Build the final text in one pass (apply edits last-to-first so earlier
    // offsets stay valid) and write it back once, so the file is reparsed a
    // single time instead of per edit.
    edits.sort((a, b) => b.start - a.start)
    let result = sf.getFullText()
    for (const e of edits) result = result.slice(0, e.start) + e.text + result.slice(e.end)
    sf.replaceWithText(result)
}
