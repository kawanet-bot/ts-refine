// initProject builds a ts-morph Project from a tsconfig path.

import {Project} from "ts-morph"
import type * as declared from "ts-refine"

export const initProject: typeof declared.initProject = (opts) => new Project(opts)
