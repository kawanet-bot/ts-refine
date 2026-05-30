// Public library entry. cli.ts also routes through here so subcommand
// runner modules stay internal.

import {Project} from "ts-morph"
import type * as declared from "ts-refine"

export {refineFormat} from "./format/refine-format.ts"
export {refineInspect} from "./inspect/refine-inspect.ts"
export {refineList} from "./list/refine-list.ts"
export {refineMove} from "./move/refine-move.ts"
export {refineRename} from "./rename/refine-rename.ts"
export {refineReport} from "./report/refine-report.ts"

// Lets callers avoid a direct ts-morph dependency for the common case.
export const initProject: typeof declared.initProject = (tsconfigPath) => new Project({tsConfigFilePath: tsconfigPath})
