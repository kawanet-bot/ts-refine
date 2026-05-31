// `list` runner: gather the cleanup-candidate entries and write the filtered
// table to stdout.

import {initProject, refineList} from "../../index.ts"
import type {CommandGlobals} from "../args-common.ts"
import type {CLIStream} from "../cli-io.ts"
import {filterListEntries, writeListTable} from "./format-list.ts"
import {parseList} from "./list-args.ts"

export async function runList(sub: string[], globals: CommandGlobals, stream: CLIStream): Promise<number> {
    const args = parseList(sub, globals)
    if (!args) return 1
    const project = initProject({tsConfigFilePath: args.tsconfigPath})
    const entries = await refineList(project, {paths: args.paths})
    writeListTable(filterListEntries(entries, args.listFilters), stream)
    return 0
}
