import alias from "@rollup/plugin-alias"
import multiEntry from "@rollup/plugin-multi-entry"
import nodeResolve from "@rollup/plugin-node-resolve"
import sucrase from "@rollup/plugin-sucrase"
import type {RollupOptions} from "rollup"
import {showFiles} from "./show-files.ts"

// Bundles the public-API suites into a single plain-JS file, so any
// supported Node.js runtime can run them against the packed dist/ without
// type-strip. Suites of internal modules stay source-only: their subjects
// are not exported, so they cannot resolve through the package entry.
const rollupConfig: RollupOptions = {
    // Whitelist: a suite listed here must reach every runtime import
    // through the package entry (see the alias below) or through
    // test-only helpers; anything else would inline library sources.
    input: [
        "../src/entrypoint.test.ts",
        "../src/format/refine-format.test.ts",
        "../src/imports/refine-imports.test.ts",
        "../src/inspect/refine-inspect.test.ts",
        "../src/list/refine-list.test.ts",
        "../src/move/refine-move.test.ts",
        "../src/move/sample-move.test.ts",
        "../src/rename/refine-rename.test.ts",
        "../src/report/refine-report.test.ts",
    ],

    // Bare specifiers stay external; only relative paths are bundled.
    external: /^[^.\/]/,

    output: {
        file: "./tests/bundled.mjs",
        format: "esm",
    },

    treeshake: false,

    plugins: [
        alias({
            entries: [
                // The suites import their subjects by relative path so they
                // run on the .ts sources directly during development. Rewrite
                // the public modules to the package name here: it stays
                // external and resolves through exports to dist/ at runtime.
                {find: /^(\.\.?\/)+index\.ts$/, replacement: "ts-refine"},
                {find: /^(\.\.?\/)+([a-z-]+\/)*refine-(format|imports|inspect|list|move|rename|report)\.ts$/, replacement: "ts-refine"},
            ],
        }),

        multiEntry(),

        nodeResolve({
            extensions: [".ts", ".js"],
            preferBuiltins: true,
        }),

        sucrase({
            disableESTransforms: true,
            exclude: ["node_modules/**"],
            transforms: ["typescript"],
        }),

        showFiles(),
    ],
}

export default rollupConfig
