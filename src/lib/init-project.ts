// initProject builds a ts-morph Project from a tsconfig path. Split out of
// index.ts so the CLI module can use it without importing index (which
// re-exports the CLI, which would be a cycle).

import {Project} from "ts-morph"
import type * as declared from "ts-refine"

export const initProject: typeof declared.initProject = (tsconfigPath) => new Project({tsConfigFilePath: tsconfigPath})
