// `format`: a fixed set of override options plus positional files.

import type {FormatOptions} from "../../recommend/format-options.ts"
import type {CommandGlobals} from "../args-common.ts"

// Raw values only: the runner resolves tsconfigPath/paths into absolute paths.
export interface FormatArgs {
    tsconfigPath: string | null
    paths: string[]
    dryRun: boolean
    applyOverrides: FormatOptions
}

export function parseFormat(sub: string[], globals: CommandGlobals): FormatArgs | undefined {
    const overrides: FormatOptions = {}
    const paths: string[] = []

    for (let i = 0; i < sub.length; i++) {
        const a = sub[i]
        if (a === "--organize-imports") {
            const v = sub[++i]
            if (v !== "on" && v !== "off") {
                console.error(`--organize-imports expects 'on' or 'off'; got: ${v ?? "(missing)"}`)
                return undefined
            }
            overrides.organizeImports = v
        } else if (a === "--semicolons") {
            const v = sub[++i]
            if (v !== "on" && v !== "off") {
                console.error(`--semicolons expects 'on' or 'off'; got: ${v ?? "(missing)"}`)
                return undefined
            }
            overrides.semicolons = v
        } else if (a === "--indent") {
            const v = sub[++i]
            if (!v || v.startsWith("-")) {
                console.error("--indent requires a positive integer or 'tab' (e.g. --indent 4)")
                return undefined
            }
            // "tab" maps to tab indentation; otherwise a positive integer.
            if (v === "tab") {
                overrides.indent = "tab"
            } else {
                const n = Number(v)
                if (!Number.isInteger(n) || n <= 0) {
                    console.error(`--indent expects a positive integer or 'tab'; got: ${v}`)
                    return undefined
                }
                overrides.indent = n
            }
        } else if (a === "--new-line") {
            // `cr` rejected: LS formatter accepts \n / \r\n only.
            const v = sub[++i]
            if (v !== "lf" && v !== "crlf") {
                console.error(`--new-line expects 'lf' or 'crlf'; got: ${v ?? "(missing)"}`)
                return undefined
            }
            overrides.newLine = v
        } else if (a === "--bracket-spacing") {
            const v = sub[++i]
            if (v !== "on" && v !== "off") {
                console.error(`--bracket-spacing expects 'on' or 'off'; got: ${v ?? "(missing)"}`)
                return undefined
            }
            overrides.bracketSpacing = v
        } else if (a.startsWith("-")) {
            console.error(`unknown option: ${a}`)
            return undefined
        } else {
            paths.push(a)
        }
    }

    return {tsconfigPath: globals.tsconfigPath, paths, dryRun: globals.dryRun, applyOverrides: overrides}
}
