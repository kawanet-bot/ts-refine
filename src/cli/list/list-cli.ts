// `list` runner: gather the cleanup-candidate entries and write the filtered
// table to stdout.

import type {Project} from "ts-morph"
import {refineList} from "../../index.ts"
import type {CLIStream} from "../cli-io.ts"
import {filterListEntries, writeListTable} from "./format-list.ts"
import type {ListArgs} from "./list-args.ts"

export async function runList(project: Project, args: ListArgs, stream: CLIStream): Promise<void> {
    const entries = await refineList(project, {paths: args.paths})
    writeListTable(filterListEntries(entries, args.listFilters), stream)
}
