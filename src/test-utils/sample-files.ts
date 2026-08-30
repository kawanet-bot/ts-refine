// Fixture paths resolve from the working directory, not import.meta.url:
// every runner (npm scripts, make's `cd ..`, IDE configs) starts at the
// package root, while the suite location changes once tests are bundled
// into builder/tests/. Fail fast when launched from anywhere else.
import {existsSync} from "node:fs"
import path from "node:path"

if (!existsSync("sample")) {
    throw new Error(`fixture tests must run from the package root: sample/ not found in ${process.cwd()}`)
}

export function samplePath(...parts: string[]): string {
    return path.resolve("sample", ...parts)
}
