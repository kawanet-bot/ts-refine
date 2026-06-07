import {Node, SyntaxKind, type SourceFile} from "ts-morph"
import type {TSR} from "ts-refine"
import {getTsRefineFormat} from "../common/emit/emit-ts-refine.ts"
import {displayPath} from "../lib/source-files.ts"
import {pickRecommendByFiles} from "./pick-recommend.ts"
import type {ReportRunOpts} from "./report-run-opts.ts"

type Style = "on" | "off"
type Axis = keyof TSR.FunctionSpacingReport
type Bucket = {lines: number; files: number; topPath: string; topLines: number}
type AxisConfig = {axis: Axis; label: string; order: readonly Style[]; example: Record<Style, string>}
type PerFile = {path: string; counts: Map<Style, number>; primary: Style}

// Keep the three TS LS spacing knobs together: anonymous `function ()`,
// named `function foo()`, and control-flow `if (x)` are reviewed as one choice.
const AXES: readonly AxisConfig[] = [
    {
        axis: "anonymousFunctionSpacing",
        label: "anonymous function",
        order: ["on", "off"],
        example: {
            on: "`function ()`",
            off: "`function()`",
        },
    },
    {
        axis: "namedFunctionSpacing",
        label: "named function",
        order: ["off", "on"],
        example: {
            on: "`function foo ()`",
            off: "`function foo()`",
        },
    },
    {
        axis: "controlKeywordSpacing",
        label: "control keyword",
        order: ["on", "off"],
        example: {
            on: "`if (x)`",
            off: "`if(x)`",
        },
    },
]

// Survey project files for the three spacing axes and render one table:
// `function ()` vs `function()`, `function foo()` vs `function foo ()`,
// and `if (x)`/`catch (e)` vs `if(x)`/`catch(e)`.
export async function runReportFunctionSpacing({sourceFiles, output, importsOnly}: ReportRunOpts): Promise<Partial<TSR.FunctionSpacingReport>> {
    if (importsOnly) return {}

    const perAxis = new Map<Axis, PerFile[]>()
    for (const axis of AXES) perAxis.set(axis.axis, [])

    for (const sf of sourceFiles) {
        const path = displayPath(sf.getFilePath())
        const countsByAxis = collectFileCounts(sf)
        for (const config of AXES) {
            const counts = countsByAxis.get(config.axis)
            if (!counts || counts.size === 0) continue
            perAxis.get(config.axis)!.push({path, counts, primary: pickPrimary(config.order, counts)})
        }
    }

    const rows: {config: AxisConfig; buckets: Map<Style, Bucket>; files: number; total: number}[] = []
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

    if (output) {
        const heading = getTsRefineFormat({functionSpacing: report}) || "(function-spacing)"
        output.write(`### ${heading}\n`)
        output.write("\n")
        output.write("| axis | style | nodes | files | example |\n")
        output.write("| --- | --- | --- | --- | --- |\n")
        for (const row of rows) {
            for (const style of row.config.order) {
                const b = row.buckets.get(style)
                if (b) {
                    output.write(`| ${row.config.label} | ${row.config.example[style]} | ${b.lines} | ${b.files} | ${b.topPath} |\n`)
                } else {
                    output.write(`| ${row.config.label} | ${row.config.example[style]} | 0 | 0 |  |\n`)
                }
            }
            output.write(`| ${row.config.label} | total | ${row.total} | ${row.files} |  |\n`)
        }
        output.write("\n")
    }
    return report
}

// Walk one file and count the AST shapes that TS LS can actually reformat:
// anonymous functions, named functions/methods, and parenthesized controls.
// Constructors and async arrows are absent; these fields do not control them.
function collectFileCounts(sf: SourceFile): Map<Axis, Map<Style, number>> {
    const countsByAxis = new Map<Axis, Map<Style, number>>()
    const add = (axis: Axis, style: Style | null): void => {
        if (!style) return
        let counts = countsByAxis.get(axis)
        if (!counts) {
            counts = new Map()
            countsByAxis.set(axis, counts)
        }
        counts.set(style, (counts.get(style) ?? 0) + 1)
    }

    sf.forEachDescendant((node) => {
        if ((Node.isFunctionExpression(node) || Node.isFunctionDeclaration(node)) && !node.getName()) {
            add("anonymousFunctionSpacing", classifyAnonymousFunction(node))
        }
        if (Node.isFunctionDeclaration(node) || Node.isFunctionExpression(node) || Node.isMethodDeclaration(node)) {
            add("namedFunctionSpacing", classifyNamedFunction(node))
        }
        if (isControlKeywordNode(node)) {
            add("controlKeywordSpacing", classifyControlKeyword(node))
        }
    })

    return countsByAxis
}

// Detect spacing after `function` in anonymous forms such as
// `const f = function () {}` and `export default function () {}`.
// Generic anonymous `function<T>()` is skipped because TS formats it as `function <T>()`.
function classifyAnonymousFunction(node: Node): Style | null {
    const text = node.getSourceFile().getFullText()
    const keyword = node.getFirstChildByKind(SyntaxKind.FunctionKeyword)
    const open = node.getFirstChildByKind(SyntaxKind.OpenParenToken)
    if (!keyword || !open) return null
    const from = keyword.getEnd()
    const to = open.getStart()
    if (to < from + 2) return classifyGap(text, from, to)
    const between = text.slice(from, to)
    const less = between.indexOf("<")
    if (less >= 0 && !between.slice(0, less).trim()) return null
    return classifyGap(text, from, to)
}

// Detect spacing before the parameter paren in named forms:
// `function foo()` / `function foo ()` and `class C { method() {} }`.
// For `function foo<T> ()`, the vote is the gap after `>`, not after `foo`.
function classifyNamedFunction(node: Node): Style | null {
    if (Node.isFunctionExpression(node) && !node.getName()) return null
    const open = node.getFirstChildByKind(SyntaxKind.OpenParenToken)
    if (!open) return null
    const name = Node.isFunctionDeclaration(node) || Node.isFunctionExpression(node) || Node.isMethodDeclaration(node) ? node.getNameNode() : undefined
    if (!name) return null
    const text = node.getSourceFile().getFullText()
    const from = name.getEnd()
    const to = open.getStart()
    if (to < from + 2) return classifyGap(text, from, to)
    const gt = text.slice(from, to).lastIndexOf(">")
    return classifyGap(text, gt < 0 ? from : from + gt + 1, to)
}

// Detect parenthesized control keyword spacing, e.g. `if (x)`, `for(x)`,
// `switch (x)`, and `catch(e)`. `do ... while` is delegated to the `while` side.
function classifyControlKeyword(node: Node): Style | null {
    if (Node.isDoStatement(node)) return classifyDoWhile(node)
    const open = node.getFirstChildByKind(SyntaxKind.OpenParenToken)
    if (!open) return null
    return classifyGap(node.getSourceFile().getFullText(), controlKeywordEnd(node), open.getStart())
}

// Detect only the `while (...)` spacing in `do { ... } while (x)`;
// the leading `do {` gap is not part of TS LS control-parenthesis spacing.
function classifyDoWhile(node: Node): Style | null {
    const nodeText = node.getText()
    const whileAt = nodeText.lastIndexOf("while")
    if (whileAt < 0) return null
    const openAt = nodeText.indexOf("(", whileAt)
    if (openAt < 0) return null
    const base = node.getStart()
    return classifyGap(node.getSourceFile().getFullText(), base + whileAt + 5, base + openAt)
}

// Turn a token-adjacent gap into `off` for `foo()` or `on` for `foo ()`.
// Comments and non-adjacent tokens like `for await (` return null instead of voting.
function classifyGap(text: string, from: number, to: number): Style | null {
    if (to < from) return null
    if (from === to) return "off"
    if (to === from + 1) return text.charCodeAt(from) <= 32 ? "on" : null
    return text.slice(from, to).trim() ? null : "on"
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

// Group files by their primary style on one axis. For example, a file with
// mostly `function foo()` lands in the `off` bucket even if it has one `foo ()`.
function buildBuckets(files: PerFile[]): Map<Style, Bucket> {
    const buckets = new Map<Style, Bucket>()
    for (const f of files) {
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
    return buckets
}

// Pick the dominant style inside one file, using the axis order as the tie-breaker:
// anonymous/control prefer spaced examples, named functions prefer no gap.
function pickPrimary(order: readonly Style[], counts: Map<Style, number>): Style {
    let best = order[0]
    let bestCount = -1
    for (const style of order) {
        const c = counts.get(style) ?? 0
        if (c > bestCount) {
            bestCount = c
            best = style
        }
    }
    return best
}
