// `move`: positional args are `<source...> <dest>` — the parser only
// validates the count and keeps them raw in `paths`; the runner resolves them
// and splits the list (last element → dest, the rest → sources). `paths`
// rather than `files` because the destination may be a directory.

import type {CommandGlobals} from "../args-common.ts"

// Raw values only: the runner resolves tsconfigPath/paths into absolute paths.
export interface MoveArgs {
    tsconfigPath: string | null
    paths: string[]
    dryRun: boolean
}

export function parseMove(sub: string[], globals: CommandGlobals): MoveArgs | undefined {
    const paths: string[] = []
    for (const a of sub) {
        if (a.startsWith("-")) {
            console.error(`unknown option: ${a}`)
            return undefined
        }
        paths.push(a)
    }

    if (paths.length < 2) {
        console.error("move requires at least one source and a destination (e.g. move foo.ts dest/)")
        return undefined
    }

    return {tsconfigPath: globals.tsconfigPath, paths, dryRun: globals.dryRun}
}
