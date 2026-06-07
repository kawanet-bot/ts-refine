import {Node, SyntaxKind, type SourceFile} from "ts-morph"
import type {TSR} from "ts-refine"
import {displayPath} from "../lib/source-files.ts"
import {writeFunctionSpacingMarkdown} from "./function-spacing-markdown.ts"
import {pickRecommendByFiles} from "./pick-recommend.ts"
import type {ReportRunOpts} from "./report-run-opts.ts"

export type FunctionSpacingStyle = "on" | "off"
export type FunctionSpacingAxis = keyof TSR.FunctionSpacingReport
export type FunctionSpacingBucket = {lines: number; files: number; topPath: string; topLines: number}
export type FunctionSpacingStyleCounts = Partial<Record<FunctionSpacingStyle, number>>
export type FunctionSpacingAxisConfig = {axis: FunctionSpacingAxis; label: string; order: readonly FunctionSpacingStyle[]; sample: Record<FunctionSpacingStyle, string>}
export type FunctionSpacingRow = {config: FunctionSpacingAxisConfig; buckets: Map<FunctionSpacingStyle, FunctionSpacingBucket>; files: number; total: number}
type Style = FunctionSpacingStyle
type Axis = FunctionSpacingAxis
type Bucket = FunctionSpacingBucket
type AxisConfig = FunctionSpacingAxisConfig
type StyleCounts = FunctionSpacingStyleCounts
type FileCounts = Record<Axis, StyleCounts>
type PerFile = {path: string; counts: StyleCounts; primary: Style}

// Keep the three TS LS spacing knobs together. The report names mirror the
// settings they feed: `function ()`, `function foo()`, and `if (x)`.
const AXES: readonly AxisConfig[] = [
    {
        axis: "functionKeywordSpacing",
        label: "function keyword",
        order: ["on", "off"],
        sample: {
            on: "`function ()`",
            off: "`function()`",
        },
    },
    {
        axis: "functionParenSpacing",
        label: "function paren",
        order: ["off", "on"],
        sample: {
            on: "`function foo ()`",
            off: "`function foo()`",
        },
    },
    {
        axis: "controlKeywordSpacing",
        label: "control keyword",
        order: ["on", "off"],
        sample: {
            on: "`if (x)`",
            off: "`if(x)`",
        },
    },
]

// Survey project files for the three spacing axes and render one table.
// Generic anonymous functions are reported on the paren axis because TS LS
// formats `function <T>()` with insertSpaceBeforeFunctionParenthesis.
export async function runReportFunctionSpacing({sourceFiles, output, importsOnly}: ReportRunOpts): Promise<Partial<TSR.FunctionSpacingReport>> {
    if (importsOnly) return {}

    const perAxis = new Map<Axis, PerFile[]>()
    for (const axis of AXES) perAxis.set(axis.axis, [])

    for (const sf of sourceFiles) {
        const path = displayPath(sf.getFilePath())
        const countsByAxis = collectFileCounts(sf)
        for (const config of AXES) {
            const counts = countsByAxis[config.axis]
            if (!hasCounts(counts)) continue
            perAxis.get(config.axis)!.push({path, counts, primary: pickPrimary(config.order, counts)})
        }
    }

    const rows: FunctionSpacingRow[] = []
    const report: TSR.FunctionSpacingReport = {}

    for (const config of AXES) {
        const files = perAxis.get(config.axis) ?? []
        const buckets = buildBuckets(files)
        const recommend = pickRecommendByFiles(config.order, (k) => buckets.get(k))
        if (recommend) report[config.axis] = recommend
        rows.push({
            config,
            buckets,
            files: files.length,
            total: [...buckets.values()].reduce((s, b) => s + b.lines, 0),
        })
    }

    if (output) writeFunctionSpacingMarkdown(report, rows, output)
    return report
}

// Walk one file and count only AST shapes controlled by these TS LS settings.
// Constructors and async arrows are intentionally absent; these fields do not
// control `constructor ()` or `async () =>`.
function collectFileCounts(sf: SourceFile): FileCounts {
    const functionKeywordSpacing: StyleCounts = {}
    const functionParenSpacing: StyleCounts = {}
    const controlKeywordSpacing: StyleCounts = {}
    const countsByAxis = {functionKeywordSpacing, functionParenSpacing, controlKeywordSpacing}

    sf.forEachDescendant((node) => {
        if ((Node.isFunctionExpression(node) || Node.isFunctionDeclaration(node)) && !node.getName()) {
            const style = classifyFunctionKeyword(node)
            if (style) functionKeywordSpacing[style] = (functionKeywordSpacing[style] ?? 0) + 1
        }
        if (Node.isFunctionDeclaration(node) || Node.isFunctionExpression(node) || Node.isMethodDeclaration(node)) {
            const style = classifyFunctionParen(node)
            if (style) functionParenSpacing[style] = (functionParenSpacing[style] ?? 0) + 1
        }
        if (isControlKeywordNode(node)) {
            const style = classifyControlKeyword(node)
            if (style) controlKeywordSpacing[style] = (controlKeywordSpacing[style] ?? 0) + 1
        }
    })

    return countsByAxis
}

// Detect spacing controlled by insertSpaceAfterFunctionKeywordForAnonymousFunctions:
// `const f = function () {}` / `function()`, plus generator `function* ()`.
// Generic anonymous `function <T>()` belongs to functionParenSpacing instead.
function classifyFunctionKeyword(node: Node): Style | null {
    const keyword = node.getFirstChildByKind(SyntaxKind.FunctionKeyword)
    const open = node.getFirstChildByKind(SyntaxKind.OpenParenToken)
    if (!keyword || !open) return null
    if (hasFunctionTypeParameters(node)) return null
    const star = node.getFirstChildByKind(SyntaxKind.AsteriskToken)
    return classifyParenGap(star ? star.getEnd() : keyword.getEnd(), open)
}

// Detect spacing controlled by insertSpaceBeforeFunctionParenthesis:
// `function foo()` / `foo ()`, methods, and generic anonymous `function <T>()`.
// The `(` previous sibling is used so `function <T extends U<V>> ()` votes
// from the outer `>` without scanning or slicing through type text.
function classifyFunctionParen(node: Node): Style | null {
    if (!hasFunctionName(node) && !hasFunctionTypeParameters(node)) return null
    const open = node.getFirstChildByKind(SyntaxKind.OpenParenToken)
    if (!open) return null
    const prev = open.getPreviousSibling()
    if (!prev) return null
    return classifyParenGap(prev.getEnd(), open)
}

// Detect parenthesized control keyword spacing, e.g. `if (x)`, `for(x)`,
// `switch (x)`, and `catch(e)`. `do ... while` is delegated to the `while` side.
function classifyControlKeyword(node: Node): Style | null {
    if (Node.isDoStatement(node)) return classifyDoWhile(node)
    const open = node.getFirstChildByKind(SyntaxKind.OpenParenToken)
    if (!open) return null
    return classifyParenGap(controlKeywordEnd(node), open)
}

// Detect only the `while (...)` spacing in `do { ... } while (x)`;
// the leading `do {` gap is not part of TS LS control-parenthesis spacing.
function classifyDoWhile(node: Node): Style | null {
    const keyword = node.getFirstChildByKind(SyntaxKind.WhileKeyword)
    const open = node.getFirstChildByKind(SyntaxKind.OpenParenToken)
    if (!keyword || !open) return null
    return classifyParenGap(keyword.getEnd(), open)
}

// Turn a token-adjacent gap into `off` for `foo()` or `on` for `foo ()`.
// Comments and non-adjacent tokens like `for await (` return null instead of voting.
function classifyParenGap(from: number, open: Node): Style | null {
    if (open.getFullStart() !== from) return null
    const to = open.getStart()
    if (to < from) return null
    if (from === to) return "off"
    if (to === from + 1) return "on"
    const trivia = open.getFullText().slice(0, open.getLeadingTriviaWidth())
    return trivia.trim() ? null : "on"
}

// Return the end offset of the keyword before `(`: `if`, `for`, `while`,
// `switch`, or `catch`, so the gap to `(` can be classified.
function controlKeywordEnd(node: Node): number {
    return node.getStart() + (Node.isIfStatement(node) ? 2 : Node.isForStatement(node) || Node.isForInStatement(node) || Node.isForOfStatement(node) ? 3 : Node.isWhileStatement(node) ? 5 : Node.isSwitchStatement(node) ? 6 : 5)
}

// Select only control nodes whose keyword spacing maps to the TS LS setting:
// `if`, `for`/`for-in`/`for-of`, `while`, `switch`, `catch`, and `do while`.
function isControlKeywordNode(node: Node): boolean {
    return Node.isIfStatement(node) || Node.isForStatement(node) || Node.isForInStatement(node) || Node.isForOfStatement(node) || Node.isWhileStatement(node) || Node.isDoStatement(node) || Node.isSwitchStatement(node) || Node.isCatchClause(node)
}

// Recognize generic function shapes through the AST, e.g. `function<T>()`
// and `function foo<T>()`, so literal `<` characters never affect the vote.
function hasFunctionTypeParameters(node: Node): boolean {
    if (Node.isFunctionDeclaration(node) || Node.isFunctionExpression(node) || Node.isMethodDeclaration(node)) return node.getTypeParameters().length > 0
    return false
}

function hasFunctionName(node: Node): boolean {
    if (Node.isFunctionDeclaration(node) || Node.isFunctionExpression(node) || Node.isMethodDeclaration(node)) return !!node.getNameNode()
    return false
}

// Group files by their primary style on one axis. For example, a file with
// mostly `function foo()` lands in the `off` bucket even if it has one `foo ()`.
function buildBuckets(files: PerFile[]): Map<Style, Bucket> {
    const buckets = new Map<Style, Bucket>()
    for (const f of files) {
        const linesAtPrimary = f.counts[f.primary] ?? 0
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
    return buckets
}

// Pick the dominant style inside one file, using the axis order as the tie-breaker:
// function keyword/control prefer spaced examples, function paren prefers no gap.
function hasCounts(counts: StyleCounts): boolean {
    return counts.on != null || counts.off != null
}

function pickPrimary(order: readonly Style[], counts: StyleCounts): Style {
    let best = order[0]
    let bestCount = -1
    for (const style of order) {
        const c = counts[style] ?? 0
        if (c > bestCount) {
            bestCount = c
            best = style
        }
    }
    return best
}
