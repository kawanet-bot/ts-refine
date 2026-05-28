// `--format ts-survey` の心臓部。`TsSurveyReport` (= 各レポートが返す
// アクション引数の Partial 集合) から、同じ推奨を再現する `ts-survey`
// 起動コマンドラインを組み立てる。`writePrettierConfig` が `.prettierrc`
// JSON を作るのと同じ流儀で、こちらは CLI flags を作る。
//
// 出力形は意図的に 2 行 (`ts-survey \` で改行 + フラグ列) にしている。
// 別段のシェル都合ではなく、`grep -E '^ +--'` でフラグだけ取り出して
// パイプ実行できるようにするため。

import type {TsSurveyReport} from "../report/run-reports.ts"
import type {Writer} from "./writable.ts"

// 推奨が出た項目だけを CLI flag 文字列の配列に直す。フラグ順は読みやすさ重視で
// 「アクション系 (--remove-semicolons 等) → 数値系 (--indent N) → 値系 (--member-separator V)」
// の固定。同じ生成物なら順序まで安定させたいので結果オブジェクト内のキー順は無視。
function buildTsSurveyFlags(report: TsSurveyReport): string[] {
    const flags: string[] = []
    if (report.semicolons?.mode === "remove") flags.push("--remove-semicolons")
    else if (report.semicolons?.mode === "insert") flags.push("--insert-semicolons")
    if (typeof report.indent?.width === "number") flags.push(`--indent ${report.indent.width}`)
    if (report.memberSeparators?.separator) flags.push(`--member-separator ${report.memberSeparators.separator}`)
    return flags
}

// `--format ts-survey` の生出力。推奨が 1 つもなければ `ts-survey` 単独行を
// そのまま出す (--format prettier が空オブジェクト `{}` を出すのと同じ扱い)。
export function writeTsSurveyCommand(report: TsSurveyReport, stream: Writer): void {
    const flags = buildTsSurveyFlags(report)
    if (flags.length === 0) {
        stream.write("ts-survey\n")
        return
    }
    stream.write("ts-survey \\\n")
    stream.write(`  ${flags.join(" ")}\n`)
}

// デフォルト Markdown 出力末尾の `## recommendation` 節。推奨が 1 つも
// なければブロック自体を出さない (空の sh フェンスを置いても意味がない)。
// 末尾の空行 1 つは他セクションのスタイルと合わせるため。
export function writeTsSurveyMarkdown(report: TsSurveyReport, stream: Writer): void {
    const flags = buildTsSurveyFlags(report)
    if (flags.length === 0) return
    stream.write("## recommendation\n")
    stream.write("\n")
    stream.write("```sh\n")
    stream.write("ts-survey \\\n")
    stream.write(`  ${flags.join(" ")}\n`)
    stream.write("```\n")
    stream.write("\n")
}
