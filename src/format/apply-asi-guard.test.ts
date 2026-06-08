// ASI-guard pass coverage. Prettier `semi: false` emits a leading `;(` to
// protect a `(`-leading statement; the LS formatter re-spaces it to `; (`.
// refineFormat({semi: "off"}) must restore the tight form without touching the
// same text inside strings / comments, `for (;;)` headers, or newline-split
// guards — and must stay inert under `semi: "on"`.

import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {initInMemoryProject} from "../common/init-project.ts"
import {refineFormat} from "./refine-format.ts"

const log = {write: (): void => undefined}

async function format(input: string, semi: "on" | "off"): Promise<string> {
    const project = initInMemoryProject()
    const sf = project.createSourceFile("a.ts", input)
    await refineFormat({project, log, dryRun: true, paths: [], style: {semi}})
    return sf.getFullText()
}

describe("refineFormat --semi off restores Prettier's tight `;(` guard", () => {
    it("tightens a guard at file start", async () => {
        const out = await format(";(async function () {\n  foo()\n})()\n", "off")
        assert.match(out, /^;\(async function/, "leading guard should stay tight")
        assert.equal(out.includes("; ("), false)
    })

    it("tightens a guard that follows a statement (the `;` is that statement's terminator)", async () => {
        // Prettier's common output: the guard rides on the previous line's end,
        // so the `;` parses as the variable statement's terminator, not an
        // EmptyStatement. Indentation is out of scope; only the `; (` matters.
        const out = await format("const a = 1\n;(foo).bar()\n", "off")
        assert.match(out, /;\(foo\)\.bar\(\)/)
        assert.equal(out.includes("; ("), false)
    })

    it("leaves `;[...]` guards alone (the LS never spaces them)", async () => {
        const out = await format("const arr = [1]\n;[x] = arr\n", "off")
        assert.match(out, /;\[x\] = arr/)
    })
})

describe("refineFormat --semi off leaves non-guard `; (` untouched", () => {
    it("keeps `; (` inside strings and template literals", async () => {
        const out = await format('const s = "; (foo)"\nconst t = `; (bar)`\n', "off")
        assert.ok(out.includes('"; (foo)"'), "string literal must be verbatim")
        assert.ok(out.includes("`; (bar)`"), "template literal must be verbatim")
    })

    it("keeps `; (` inside comments", async () => {
        const out = await format("// ; (foo)\nconst x = 1\n", "off")
        assert.ok(out.includes("// ; (foo)"))
    })

    it("keeps the `; (` in a `for (...; (cond); ...)` header", async () => {
        const out = await format("for (let i = 0; (i) < 3; i++) {\n  use(i)\n}\n", "off")
        assert.ok(out.includes("; (i) < 3"), "for-header semicolon must not be tightened")
    })

    it("does not join a guard split across a newline", async () => {
        const out = await format("const a = 1\n;\n(foo)\n", "off")
        assert.match(out, /;\n\(foo\)/, "a `;` and `(` on separate lines stay separate")
    })

    it("does not tighten across an interposed comment", async () => {
        const out = await format("const a = 1\n; /* c */ (foo)\n", "off")
        assert.ok(out.includes("; /* c */ ("), "comment between `;` and `(` blocks the join")
    })
})

describe("refineFormat --semi on leaves the guard pass inert", () => {
    it("does not run the ASI-guard fixup under `semi: on`", async () => {
        // The leading-`;` guard is a semicolon-free idiom; under `on` the pass
        // is gated off, so the LS-spaced form is left as the formatter produced.
        const out = await format(";(async function () {\n  foo()\n})()\n", "on")
        assert.ok(out.includes("; ("), "semi:on must not invoke the guard pass")
    })
})
