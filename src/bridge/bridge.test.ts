// Happy-path coverage for the ts-morph compatibility layer. The library's own
// suites prove end-to-end behavior; these checks pin the bridge surface so a
// future break is attributable to the bridge rather than the library or
// TypeScript itself.

import assert from "node:assert/strict"
import {test} from "node:test"
import {Node, Project} from "./bridge.ts"

function project(): Project {
    return new Project({useInMemoryFileSystem: true})
}

test("navigation: imports, specifiers, named bindings", () => {
    const p = project()
    const a = p.createSourceFile("/p/a.ts", `import {b} from "./b.ts"\nimport type {T} from "./b.ts"\nexport const x: T = b\n`)
    p.createSourceFile("/p/b.ts", "export const b = 1\nexport type T = number\n")

    assert.equal(p.getSourceFiles().length, 2)
    const imports = a.getImportDeclarations()
    assert.equal(imports.length, 2)
    assert.equal(imports[0].getModuleSpecifierValue(), "./b.ts")
    assert.equal(imports[0].getModuleSpecifierSourceFile()?.getFilePath(), "/p/b.ts")
    assert.equal(imports[0].getNamedImports()[0].getName(), "b")
    assert.equal(imports[1].isTypeOnly(), true)
})

test("getExportedDeclarations groups exports and maps to declarations", () => {
    const p = project()
    const a = p.createSourceFile("/p/a.ts", "export function foo() { return 1 }\nexport const bar = 2\n")
    const map = a.getExportedDeclarations()
    assert.deepEqual([...map.keys()].sort(), ["bar", "foo"])
    assert.ok(Node.isFunctionDeclaration(map.get("foo")![0]))
})

test("rename updates the declaration and every importer", () => {
    const p = project()
    const a = p.createSourceFile("/p/a.ts", "export const foo = 1\n")
    const b = p.createSourceFile("/p/b.ts", `import {foo} from "./a.ts"\nconsole.log(foo)\n`)
    const nameNode = (a.getExportedDeclarations().get("foo")![0] as unknown as {getNameNode(): Node}).getNameNode()
    nameNode.rename("renamed")
    assert.match(a.getFullText(), /export const renamed = 1/)
    assert.match(b.getFullText(), /import \{renamed\} from/)
    assert.match(b.getFullText(), /console\.log\(renamed\)/)
})

test("move relocates the file and rewrites importer specifiers", () => {
    const p = project()
    const a = p.createSourceFile("/p/a.ts", "export const a = 1\n")
    const b = p.createSourceFile("/p/b.ts", `import {a} from "./a.ts"\nexport const b = a\n`)
    a.move("/p/sub/a.ts")
    assert.equal(a.getFilePath(), "/p/sub/a.ts")
    assert.match(b.getFullText(), /from "\.\/sub\/a/)
})

test("organizeImports sorts named specifiers", () => {
    const p = project()
    const a = p.createSourceFile("/p/a.ts", `import {b, a} from "./x.ts"\nconsole.log(a, b)\n`)
    p.createSourceFile("/p/x.ts", "export const a = 1\nexport const b = 2\n")
    a.organizeImports({})
    assert.match(a.getImportDeclarations()[0].getText(), /\{\s*a,\s*b\s*\}/)
})

test("findReferencesAsNodes spans declaration and usage files", () => {
    const p = project()
    const a = p.createSourceFile("/p/a.ts", "export const foo = 1\n")
    p.createSourceFile("/p/b.ts", `import {foo} from "./a.ts"\nconsole.log(foo)\n`)
    const nameNode = (a.getExportedDeclarations().get("foo")![0] as unknown as {getNameNode(): Node}).getNameNode()
    const files = new Set(nameNode.findReferencesAsNodes().map((r) => r.getSourceFile().getFilePath()))
    assert.ok(files.has("/p/a.ts"))
    assert.ok(files.has("/p/b.ts"))
})

test("a reference captured before a move stays valid after it", () => {
    const p = project()
    const a = p.createSourceFile("/p/a.ts", "export const a = 1\n")
    const b = p.createSourceFile("/p/b.ts", `import {a} from "./a.ts"\n`)
    const decl = b.getImportDeclarations()[0]
    a.move("/p/sub/a.ts")
    // The wrapper revalidates against the reparsed tree after the move's edit.
    assert.match(decl.getModuleSpecifierValue(), /sub\/a/)
})
