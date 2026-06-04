import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {Project} from "ts-morph"
import {applyMemberSeparators} from "./apply-member-separators.ts"

// Operates on the AST directly (no formatText) so the assertions pin exactly
// what the separator pass does, free of LS whitespace normalization.
function run(src: string, style: "semi" | "comma" | "none"): string {
    const p = new Project({useInMemoryFileSystem: true})
    const sf = p.createSourceFile("/a.ts", src, {overwrite: true})
    applyMemberSeparators(sf, style)
    return sf.getFullText()
}

const IFACE = "interface I {\n    a: number\n    b(): void\n    c: string\n}\n"

describe("applyMemberSeparators", () => {
    it("semi: every interface member (incl. method signature) ends with `;`", () => {
        assert.equal(run(IFACE, "semi"), "interface I {\n    a: number;\n    b(): void;\n    c: string;\n}\n")
    })

    it("comma: every interface member ends with `,` (incl. the last)", () => {
        assert.equal(run(IFACE, "comma"), "interface I {\n    a: number,\n    b(): void,\n    c: string,\n}\n")
    })

    it("none: drops separators when members are newline-separated", () => {
        const semi = "interface I {\n    a: number;\n    b: string;\n}\n"
        assert.equal(run(semi, "none"), "interface I {\n    a: number\n    b: string\n}\n")
    })

    it("converts between styles (comma → semi)", () => {
        const comma = "interface J {\n    a: number,\n    b: string,\n}\n"
        assert.equal(run(comma, "semi"), "interface J {\n    a: number;\n    b: string;\n}\n")
    })

    it("normalizes class fields but leaves body-bearing members untouched", () => {
        const cls = "class C {\n    x = 1\n    m() { return 1 }\n    y = 2\n}\n"
        const out = run(cls, "semi")
        assert.match(out, /x = 1;/)
        assert.match(out, /y = 2;/)
        // The method keeps its own `}` body — no separator appended after it.
        assert.match(out, /m\(\) \{ return 1 \}\n/)
    })

    it("none keeps `;` between same-line members (removing it would be a syntax error)", () => {
        // Single-line members share a line, so a separator is structurally
        // required between them; only the trailing one can go.
        const inline = "interface S { a: number; b: string; }\n"
        const out = run(inline, "none")
        assert.match(out, /a: number; b: string\b/)
        assert.ok(!/b: string;/.test(out), "trailing separator on the last member is dropped")
    })

    it("is idempotent (a second pass changes nothing)", () => {
        const once = run(IFACE, "comma")
        const twice = run(once, "comma")
        assert.equal(twice, once)
    })

    it("leaves a type literal untouched (out of v1 scope: interface/class only)", () => {
        const lit = "type T = {p: number; q: number}\n"
        assert.equal(run(lit, "comma"), lit)
    })
})
