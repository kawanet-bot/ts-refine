// for-header semicolon pass. The TS formatter spaces a `for (init; test; update)`
// header via insertSpaceAfterSemicolonInForStatements (on by default). That is
// right for full headers, but it can't be toggled to match Prettier: turning it
// off would also strip the wanted spaces in `for (a; b; c)`. The divergence is
// confined to empty trailing clauses — an empty update leaves `;)` where
// Prettier keeps `; )`, and an all-empty header becomes `for (; ;)` where
// Prettier writes `for (;;)`. Reassert just those after formatText. Runs for
// every style, since Prettier spaces the header the same way regardless.

import type {ForStatement, Node as TsNode, SourceFile as TsSourceFile} from "typescript"
import {SyntaxKind} from "typescript"
import type {SourceFile} from "../bridge/bridge.ts"

type Edit = {start: number; end: number; text: string}

// Cheap gate: only a header whose update clause is empty puts a `;` right before
// the `)`, so nothing else can need a fix. The AST walk is the real filter that
// excludes strings, comments, and `for...of` / `for...in`.
const SEMI_BEFORE_PAREN = /;[ \t]*\)/

export function applyForHeaderSemicolons(sf: SourceFile): void {
    const full = sf.getFullText()
    if (!SEMI_BEFORE_PAREN.test(full)) return

    const tsSf = sf.compilerNode
    const edits: Edit[] = []

    const visit = (node: TsNode): void => {
        if (node.kind === SyntaxKind.ForStatement) {
            collectForHeaderEdits(edits, full, tsSf, node as ForStatement)
        }
        node.forEachChild(visit)
    }
    visit(tsSf)

    if (edits.length === 0) return

    let result = full
    for (const e of edits.sort((a, b) => b.start - a.start)) {
        result = result.slice(0, e.start) + e.text + result.slice(e.end)
    }
    sf.replaceWithText(result)
}

function collectForHeaderEdits(edits: Edit[], full: string, tsSf: TsSourceFile, node: ForStatement): void {
    // All three clauses absent → Prettier writes `;;` tight; otherwise it joins
    // the clauses with `; `, so every `;` is followed by exactly one space. The
    // gap before each `;` and after `(` already matches, so only fix what trails.
    const allEmpty = node.initializer == null && node.condition == null && node.incrementor == null
    const trailing = allEmpty ? "" : " "

    // The two `;` are tokens rather than child nodes, so read them off
    // getChildren; the token after each (the next clause, the next `;`, or `)`)
    // bounds the gap whose spacing is reasserted.
    const children = node.getChildren(tsSf)
    for (let i = 0; i < children.length - 1; i++) {
        const child = children[i]
        if (child.kind !== SyntaxKind.SemicolonToken) continue
        addGapEdit(edits, full, child.end, children[i + 1].getStart(tsSf), trailing)
    }
}

function addGapEdit(edits: Edit[], full: string, start: number, end: number, text: string): void {
    if (start > end) return
    const current = full.slice(start, end)
    if (current === text) return

    // Only rewrite plain horizontal whitespace: a comment or a line break in the
    // gap marks a commented or multi-line header, left to the LS formatter.
    for (let i = 0; i < current.length; i++) {
        const c = current.charCodeAt(i)
        if (c !== 0x20 && c !== 0x09) return
    }
    edits.push({start, end, text})
}
