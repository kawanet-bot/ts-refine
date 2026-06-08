// `-v` banner: this package's version plus the TypeScript compiler that
// actually drives the refactors at runtime. The package version is read from
// package.json — inlined at build by @rollup/plugin-json, and read directly
// under Node's type-strip during tests, so both paths share one source.

import ts from "typescript"
import pkg from "../../package.json" with {type: "json"}

export function versionText(): string {
    return `ts-refine ${pkg.version}\ntypescript ${ts.version}`
}
