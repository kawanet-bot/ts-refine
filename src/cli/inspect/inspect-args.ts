// `inspect`: per-file analysis. `--<inspector>` flags select which
// inspectors run (default: all). Unknown `--<name>` becomes a selector
// and is validated at runtime by refineInspect (mirrors parseReport).

import {inspectorNames as knownInspectorNames} from "../../inspect/inspector-names.ts"
import type {CommandGlobals} from "../args-common.ts"

// Raw values only: the runner resolves tsconfigPath/paths into absolute paths.
export interface InspectArgs {
    tsconfigPath: string | null
    paths: string[]
    // The requested inspector selectors, or the full registry.
    inspectorNames: string[]
}

export function parseInspect(sub: string[], globals: CommandGlobals): InspectArgs | undefined {
    const inspectorNames: string[] = []
    const paths: string[] = []

    for (const a of sub) {
        if (a.startsWith("--")) {
            const name = a.slice(2)
            if (!inspectorNames.includes(name)) inspectorNames.push(name)
        } else if (a.startsWith("-")) {
            console.error(`unknown option: ${a}`)
            return undefined
        } else {
            paths.push(a)
        }
    }

    const effective = inspectorNames.length > 0 ? inspectorNames : [...knownInspectorNames]
    return {tsconfigPath: globals.tsconfigPath, paths, inspectorNames: effective}
}
