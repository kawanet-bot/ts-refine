// 公開アクションは未実装。`RunMemberSeparatorsOpts` だけ先に切ってあるのは、
// レポート戻り値の型を「アクション引数」の枠に揃える設計を維持するため
// (`RunSemicolonsOpts` / `RunIndentOpts` と同じ流儀)。`--format ts-survey` と
// `--format prettier` はこのインタフェースを介してレポート結果から CLI フラグ /
// `.prettierrc` を再構築する。アクション本体が入ったらここに `runMemberSeparators`
// を足す。

import type {RunOrganizeImportsOpts} from "./organize-imports.ts"

export interface RunMemberSeparatorsOpts extends RunOrganizeImportsOpts {
    // CLI フラグと同じ語彙にしておく (`--member-separator semi|comma|none`)。
    separator: "semi" | "comma" | "none"
}
