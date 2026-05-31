// `inspect` runner: run the selected inspectors and write each file's
// analysis to stdout.

import {initProject, refineInspect, type TSR} from "../../index.ts"
import type {CommandGlobals} from "../args-common.ts"
import type {CLIStream} from "../cli-io.ts"
import {writeInspectFile} from "./format-inspect.ts"
import {parseInspect} from "./inspect-args.ts"

export async function runInspect(sub: string[], globals: CommandGlobals, stream: CLIStream): Promise<number> {
    const args = parseInspect(sub, globals)
    if (!args) return 1
    const project = initProject({tsConfigFilePath: args.tsconfigPath})
    const inspectorNames = args.inspectorNames as TSR.InspectorName[]
    const files = await refineInspect(project, {paths: args.paths, inspectorNames})
    for (const file of files) writeInspectFile(file, stream)
    return 0
}
