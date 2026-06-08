// for-header semicolon pass coverage. The LS formatter spaces empty for-header
// clauses as `for (; ;)` and trims `; )` to `;)`; refineFormat must restore
// Prettier's `for (;;)` and `; )` forms regardless of the semi value, without
// disturbing full headers, strings/comments, for...of/in, or multi-line headers.

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

// The eight clause-presence combinations, in the form Prettier emits them. The
// pass must leave each unchanged after the LS would have re-spaced it.
const PRETTIER_HEADERS = ["for (;;)", "for (let i = 0; ; )", "for (; i < n; )", "for (; ; i++)", "for (let i = 0; i < n; )", "for (let i = 0; ; i++)", "for (; i < n; i++)", "for (let i = 0; i < n; i++)"]

for (const semi of ["off", "on"] as const) {
    describe(`refineFormat --semi ${semi} matches Prettier's for-header semicolons`, () => {
        for (const header of PRETTIER_HEADERS) {
            it(`keeps ${JSON.stringify(header)} unchanged`, async () => {
                const out = await format(`${header} {\n    f()\n}\n`, semi)
                assert.equal(out.split("\n")[0], `${header} {`)
            })
        }

        it("collapses the LS `for (; ;)` back to `for (;;)`", async () => {
            const out = await format("for (; ;) {\n    f()\n}\n", semi)
            assert.match(out, /^for \(;;\) \{/)
        })
    })
}

describe("applyForHeaderSemicolons leaves unrelated text alone", () => {
    it("does not touch `;)` inside a string or comment", async () => {
        const out = await format('const s = ";)"\n// trailing ;)\nfor (;;) {\n    f()\n}\n', "off")
        assert.ok(out.includes('";)"'), "string literal must be verbatim")
        assert.ok(out.includes("// trailing ;)"), "comment must be verbatim")
    })

    it("leaves for...of / for...in headers (no header semicolons) alone", async () => {
        const out = await format("for (const x of xs) {\n    f(x)\n}\nfor (const k in obj) {\n    g(k)\n}\n", "off")
        assert.ok(out.includes("for (const x of xs)"))
        assert.ok(out.includes("for (const k in obj)"))
    })

    it("leaves a multi-line for-header to the LS formatter", async () => {
        const input = "for (\n    let i = 0;\n    i < n;\n) {\n    f(i)\n}\n"
        const out = await format(input, "off")
        // The empty update sits on its own line; the pass only rewrites
        // single-line gaps, so the multi-line header is untouched.
        assert.ok(out.includes("    i < n;\n)"), "multi-line header stays as-is")
    })
})
