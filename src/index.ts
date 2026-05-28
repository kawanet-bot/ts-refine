// Public library entry. Exposes the four top-level operations callers use
// programmatically; the CLI in cli.ts also routes through here so action
// and report modules stay internal.

import type * as declared from "@kawanet/ts-survey"
import {Project} from "ts-morph"

export {runIndent} from "./action/indent.ts"
export {runOrganizeImports} from "./action/organize-imports.ts"
export {runSemicolons} from "./action/semicolons.ts"
export {runReports} from "./report/run-reports.ts"

// Thin wrapper around `new Project({tsConfigFilePath})`. Spares callers
// from importing ts-morph directly when all they need is a Project to
// hand to the run* functions.
export const initProject: typeof declared.initProject = (tsconfigPath) => new Project({tsConfigFilePath: tsconfigPath})
