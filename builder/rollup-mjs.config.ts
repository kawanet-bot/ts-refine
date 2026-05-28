import nodeResolve from "@rollup/plugin-node-resolve"
import sucrase from "@rollup/plugin-sucrase"
import type {RollupOptions} from "rollup"
import {isExternal} from "./externals.ts"

const rollupConfig: RollupOptions = {
    input: "../src/index.ts",

    output: {
        file: "../dist/ts-survey.mjs",
        format: "esm",
    },

    external: isExternal,

    plugins: [
        nodeResolve({
            extensions: [".ts", ".js"],
            preferBuiltins: true,
        }),

        sucrase({
            exclude: ["node_modules/**"],
            transforms: ["typescript"],
        }),
    ],
}

export default rollupConfig
