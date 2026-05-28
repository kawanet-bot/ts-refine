// Public library entry. Exposes the three top-level operations callers
// use programmatically; the CLI in cli.ts also routes through here so
// action and report modules stay internal.

import type * as declared from "@kawanet/ts-survey"
import {Project} from "ts-morph"

export {runFix} from "./action/run-fix.ts"
export {runReports} from "./report/run-reports.ts"

// Thin wrapper around `new Project({tsConfigFilePath})`. Spares callers
// from importing ts-morph directly when all they need is a Project to
// hand to the run* functions.
export const initProject: typeof declared.initProject = (tsconfigPath) => new Project({tsConfigFilePath: tsconfigPath})
