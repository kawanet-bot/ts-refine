// `inspect` runner: run the selected inspectors and write each file's
// analysis to stdout.

import type {Project} from "ts-morph"
import {refineInspect, type TSR} from "../../index.ts"
import type {CLIStream} from "../cli-io.ts"
import {writeInspectFile} from "./format-inspect.ts"
import type {InspectArgs} from "./inspect-args.ts"

export async function runInspect(project: Project, args: InspectArgs, stream: CLIStream): Promise<void> {
    const inspectorNames = args.inspectorNames as TSR.InspectorName[]
    const files = await refineInspect(project, {paths: args.paths, inspectorNames})
    for (const file of files) writeInspectFile(file, stream)
}
