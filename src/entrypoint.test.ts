// Pins the public entry surface. The declaration assignment makes tsc
// fail when a name declared in the published .d.ts is missing from the
// runtime entry; the test checks the same names on the built output.
import {strict as assert} from "node:assert"
import {test} from "node:test"
import type * as declared from "ts-refine"
import * as m from "./index.ts"

const runtime: typeof declared = m
void runtime

test("import entry (.mjs)", () => {
    assert.equal(typeof m.createRefineProject, "function")
    assert.equal(typeof m.refineFormat, "function")
    assert.equal(typeof m.refineImports, "function")
    assert.equal(typeof m.refineInspect, "function")
    assert.equal(typeof m.refineList, "function")
    assert.equal(typeof m.refineMove, "function")
    assert.equal(typeof m.refineRename, "function")
    assert.equal(typeof m.refineReport, "function")
})
