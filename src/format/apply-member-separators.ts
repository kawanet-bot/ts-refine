// memberSeparators apply pass. The LS formatter can't set interface / type
// member separators (and can't emit commas at all), so refineFormat runs this
// after formatText to normalize each member's trailing punctuation to the
// chosen style. Scope mirrors the member-separators report: interface and
// class members (body-bearing members carry no separator).

import type {ClassMemberTypes, SourceFile, TypeElementTypes} from "ts-morph"
import {Node} from "ts-morph"
import type {TSR} from "ts-refine"
import {isSeparableMember} from "../report/member-separators.ts"

type Member = ClassMemberTypes | TypeElementTypes

// The member node text includes its trailing `;` / `,` (getText covers it),
// so drop a single trailing separator to rebuild from a clean base.
function stripSeparator(text: string): string {
    const t = text.trimEnd()
    return t.endsWith(";") || t.endsWith(",") ? t.slice(0, -1) : t
}

// Separator to place after `member`. `;` / `,` are valid even as the last
// member's trailing token, so they apply unconditionally. `none` removes the
// separator only where a newline already splits this member from the next —
// removing an inline separator would fuse two members into a syntax error, so
// a same-line gap keeps `;`.
function desiredSeparator(style: TSR.MemberSeparatorsOpts["separator"], members: Member[], i: number): string {
    if (style === "semi") return ";"
    if (style === "comma") return ","
    const next = members[i + 1]
    if (next == null) return "" // last member: nothing to separate from `}`
    return members[i].getEndLineNumber() < next.getStartLineNumber() ? "" : ";"
}

export function applyMemberSeparators(sf: SourceFile, style: TSR.MemberSeparatorsOpts["separator"]): void {
    type Edit = {start: number; end: number; text: string}
    const edits: Edit[] = []

    sf.forEachDescendant((node) => {
        if (!Node.isInterfaceDeclaration(node) && !Node.isClassDeclaration(node)) return
        const members = (node.getMembers() as Member[]).filter(isSeparableMember)
        members.forEach((member, i) => {
            const text = member.getText()
            const next = stripSeparator(text) + desiredSeparator(style, members, i)
            if (next !== text) edits.push({start: member.getStart(), end: member.getEnd(), text: next})
        })
    })

    if (edits.length === 0) return
    // Apply last-to-first so each edit's offsets stay valid after the prior ones.
    edits.sort((a, b) => b.start - a.start)
    for (const e of edits) sf.replaceText([e.start, e.end], e.text)
}
