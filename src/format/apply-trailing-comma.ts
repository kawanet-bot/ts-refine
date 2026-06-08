// trailingComma apply pass. The LS formatter has no trailing-comma control, so
// refineFormat runs this after formatText. `on` adds a trailing comma to a
// comma-separated list that the author wrote across multiple lines and removes
// it from a single-line one; `off` removes it from those same lists. ts-refine
// has no printWidth, so "multiline" means the author's own layout (the closing
// bracket sits on a later line than the last element), not a reflow decision.
//
// Out of scope: interface / type-literal / class member lists (the separators
// pass owns those) and angle-bracket lists `<...>` (type parameters and type
// arguments, incl. TSX `<T,>`), which are left untouched. A spread / rest last
// element (`...x`) is also left as written in both modes: adding a comma there
// is a syntax error in rest / binding positions, so honoring `off` (remove) but
// not `on` (add) would be lopsided — the position is excluded outright.
//
// Walks the TypeScript compiler AST directly. ts-morph's forEachDescendant
// allocated a wrapper Node per visit and dominated this pass's cost. The
// helpers below take compiler nodes so report/trailing-comma can keep its
// ts-morph descendant walk and just hand off `node.compilerNode` per visit.

import {SyntaxKind, type SourceFile} from "ts-morph"
import type {
    ArrayBindingPattern,
    ArrayLiteralExpression,
    CallExpression,
    EnumDeclaration,
    NamedExports,
    NamedImports,
    NewExpression,
    NodeArray,
    ObjectBindingPattern,
    ObjectLiteralExpression,
    SignatureDeclaration,
    Node as TsNode,
    TupleTypeNode,
} from "typescript"
import {hasLineBreakBetween} from "../lib/text-ranges.ts"

// Function-like nodes whose parameter list carries a trailing comma.
const PARAMETER_KINDS = new Set<SyntaxKind>([
    SyntaxKind.FunctionDeclaration,
    SyntaxKind.FunctionExpression,
    SyntaxKind.ArrowFunction,
    SyntaxKind.MethodDeclaration,
    SyntaxKind.Constructor,
    SyntaxKind.GetAccessor,
    SyntaxKind.SetAccessor,
    SyntaxKind.MethodSignature,
    SyntaxKind.CallSignature,
    SyntaxKind.ConstructSignature,
    SyntaxKind.FunctionType,
    SyntaxKind.ConstructorType,
])

// A comma-separated list this pass acts on. `hasTrailingComma` is the parser's
// own flag on `NodeArray`; `closeStart` is the source position of the closing
// bracket / brace / paren token.
export type ListInfo = {elements: readonly TsNode[]; hasTrailingComma: boolean; closeStart: number}

// Resolve the list a node owns. Returns undefined for nodes outside this
// pass's scope, for empty lists (nothing to vote on), or — for parameter
// lists without parens, like a bare arrow `x => x` — when no close paren
// is found.
export function listOf(node: TsNode, text: string): ListInfo | undefined {
    const els = elementsOf(node)
    if (els == null || els.length === 0) return undefined

    // Function-like nodes extend past the close paren (signature/body follow),
    // so `node.end` is not the close position. Scan forward from the last
    // parameter for `)`, skipping comments and an optional trailing comma.
    // A bare arrow (`x => x`) hits a non-list character before `)` and is
    // rightly skipped (returns undefined).
    if (PARAMETER_KINDS.has(node.kind)) {
        const closeStart = findListCloseParen(text, els[els.length - 1].end)
        if (closeStart < 0) return undefined
        return {elements: els, hasTrailingComma: els.hasTrailingComma === true, closeStart}
    }

    // For every other kind here the close token is a single character and the
    // node ends right after it, so `node.end - 1` is the close position.
    return {elements: els, hasTrailingComma: els.hasTrailingComma === true, closeStart: node.end - 1}
}

// Spread (`...x`) / rest element detection via AST kinds rather than a `...`
// text prefix. Avoids allocating the node's text per visit.
export function isSpreadOrRest(node: TsNode): boolean {
    switch (node.kind) {
        case SyntaxKind.SpreadElement:
        case SyntaxKind.SpreadAssignment:
        case SyntaxKind.RestType:
            return true
    }
    return (node as {dotDotDotToken?: unknown}).dotDotDotToken != null
}

// Per-kind element array extraction. Returned as `NodeArray<Node>` so the
// caller can also read the parser's `hasTrailingComma` flag on it.
function elementsOf(node: TsNode): NodeArray<TsNode> | undefined {
    switch (node.kind) {
        case SyntaxKind.ArrayLiteralExpression:
            return (node as ArrayLiteralExpression).elements as unknown as NodeArray<TsNode>
        case SyntaxKind.ArrayBindingPattern:
            return (node as ArrayBindingPattern).elements as unknown as NodeArray<TsNode>
        case SyntaxKind.TupleType:
            return (node as TupleTypeNode).elements as unknown as NodeArray<TsNode>
        case SyntaxKind.ObjectLiteralExpression:
            return (node as ObjectLiteralExpression).properties as unknown as NodeArray<TsNode>
        case SyntaxKind.ObjectBindingPattern:
            return (node as ObjectBindingPattern).elements as unknown as NodeArray<TsNode>
        case SyntaxKind.NamedImports:
            return (node as NamedImports).elements as unknown as NodeArray<TsNode>
        case SyntaxKind.NamedExports:
            return (node as NamedExports).elements as unknown as NodeArray<TsNode>
        case SyntaxKind.EnumDeclaration:
            return (node as EnumDeclaration).members as unknown as NodeArray<TsNode>
        case SyntaxKind.CallExpression:
            return (node as CallExpression).arguments as unknown as NodeArray<TsNode>
        case SyntaxKind.NewExpression:
            return (node as NewExpression).arguments as unknown as NodeArray<TsNode> | undefined
    }
    if (PARAMETER_KINDS.has(node.kind)) {
        return (node as SignatureDeclaration).parameters as unknown as NodeArray<TsNode>
    }
    return undefined
}

// Locate the close paren for a parameter list given the end position of its
// last parameter. Walks only over whitespace, comments, and at most one
// trailing comma — anything else means this is not a parenthesized list and
// the pass leaves it alone.
function findListCloseParen(text: string, from: number): number {
    let i = from
    while (i < text.length) {
        const c = text.charCodeAt(i)
        if (c === 41) return i // ')'
        if (c === 47) { // '/'
            const next = text.charCodeAt(i + 1)
            if (next === 47) {
                const nl = text.indexOf("\n", i + 2)
                if (nl < 0) return -1
                i = nl + 1
                continue
            }
            if (next === 42) {
                const end = text.indexOf("*/", i + 2)
                if (end < 0) return -1
                i = end + 2
                continue
            }
            return -1
        }
        // 9 tab, 10 LF, 13 CR, 32 space, 44 comma
        if (c !== 9 && c !== 10 && c !== 13 && c !== 32 && c !== 44) return -1
        i++
    }
    return -1
}

// Find the trailing comma between a list's last element and its close token,
// skipping line and block comments so a `,` inside a trailing comment (the
// motivation for the previous AST-based lookup) is never misread as the
// delimiter. The parser's `hasTrailingComma` flag tells us one exists; this
// returns its exact position so it can be deleted.
function findCommaSkippingComments(text: string, from: number, to: number): number {
    let i = from
    while (i < to) {
        const c = text.charCodeAt(i)
        if (c === 44) return i // ','
        if (c === 47) { // '/'
            const next = text.charCodeAt(i + 1)
            if (next === 47) {
                const nl = text.indexOf("\n", i + 2)
                if (nl < 0 || nl >= to) return -1
                i = nl + 1
                continue
            }
            if (next === 42) {
                const end = text.indexOf("*/", i + 2)
                if (end < 0 || end >= to) return -1
                i = end + 2
                continue
            }
        }
        i++
    }
    return -1
}

// importsOnly narrows the walk to import/export specifier lists, so the
// imports/move/rename commands reassert the comma style without touching any
// other list in the file. The format command omits it and walks the whole file.
export function applyTrailingComma(sf: SourceFile, mode: "on" | "off", opts?: {importsOnly?: boolean}): void {
    const full = sf.getFullText()
    const tsSf = sf.compilerNode
    const edits: {start: number; end: number; text: string}[] = []

    const visit = (node: TsNode): void => {
        applyToNode(node, full, mode, edits)
        node.forEachChild(visit)
    }

    if (opts?.importsOnly) {
        // Recurse into the file only until an import/export declaration is
        // reached, then run the full list walk inside it.
        const walkImports = (node: TsNode): void => {
            if (node.kind === SyntaxKind.ImportDeclaration || node.kind === SyntaxKind.ExportDeclaration) {
                visit(node)
            } else {
                node.forEachChild(walkImports)
            }
        }
        walkImports(tsSf)
    } else {
        visit(tsSf)
    }

    if (edits.length === 0) return

    // Build the final text once (last-to-first so offsets stay valid) and write
    // it back with a single replaceWithText — no mutation during the walk.
    edits.sort((a, b) => b.start - a.start)
    let result = full
    for (const e of edits) result = result.slice(0, e.start) + e.text + result.slice(e.end)
    sf.replaceWithText(result)
}

function applyToNode(node: TsNode, full: string, mode: "on" | "off", edits: {start: number; end: number; text: string}[]): void {
    const list = listOf(node, full)
    if (list == null) return
    const last = list.elements[list.elements.length - 1]
    if (isSpreadOrRest(last)) return

    const end = last.end
    const multiline = hasLineBreakBetween(full, end, list.closeStart)
    const wantComma = mode === "on" && multiline
    if (wantComma === list.hasTrailingComma) return // already conforms

    if (wantComma) {
        edits.push({start: end, end, text: ","}) // insert after the element
    } else {
        const commaPos = findCommaSkippingComments(full, end, list.closeStart)
        if (commaPos >= 0) {
            edits.push({start: commaPos, end: commaPos + 1, text: ""}) // drop the trailing comma
        }
    }
}
