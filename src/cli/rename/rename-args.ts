// `rename`: rename an exported identifier. --from / --to are required; an
// optional positional file scopes the lookup to that file's exports.

import type {CommandGlobals} from "../args-common.ts"

// Raw values only: the runner resolves tsconfigPath/paths into absolute paths.
// `paths` holds the optional scope file (zero or one entry).
export interface RenameArgs {
    tsconfigPath: string | null
    paths: string[]
    dryRun: boolean
    from: string
    to: string
}

export function parseRename(sub: string[], globals: CommandGlobals): RenameArgs | undefined {
    let from: string | undefined
    let to: string | undefined
    const paths: string[] = []

    for (let i = 0; i < sub.length; i++) {
        const a = sub[i]
        if (a === "--from") {
            from = sub[++i]
            if (!from || from.startsWith("-")) {
                console.error("--from requires an identifier (e.g. --from oldName)")
                return undefined
            }
        } else if (a === "--to") {
            to = sub[++i]
            if (!to || to.startsWith("-")) {
                console.error("--to requires an identifier (e.g. --to newName)")
                return undefined
            }
        } else if (a.startsWith("-")) {
            console.error(`unknown option: ${a}`)
            return undefined
        } else {
            paths.push(a)
        }
    }

    if (from === undefined || to === undefined) {
        console.error("rename requires --from <name> and --to <name>")
        return undefined
    }
    if (paths.length > 1) {
        console.error("rename accepts at most one file to scope the lookup")
        return undefined
    }

    return {tsconfigPath: globals.tsconfigPath, paths, dryRun: globals.dryRun, from, to}
}
