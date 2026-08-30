// Test project factories, built on the public createRefineProject entry so
// projects always come from the same factory the published package ships:
// resolveProject() rejects a project born from a different copy of this
// package, which matters once bundled suites run against dist/, not src/.

import type {Project, ProjectOptions} from "../bridge/bridge.ts"
import {createRefineProject} from "../index.ts"

// The public factory forwards the full option bag at runtime; the published
// TSR.ProjectOptions type just keeps the surface minimal. Widen it here so
// tests can pass internal-only options such as skipLoadingLibFiles.
const newProject = createRefineProject as (options?: ProjectOptions) => Project

// Builds a project from a tsconfig on disk (sample fixtures, on-disk cases).
// skipLoadingLibFiles pinned: the refactoring suites operate on their own
// source symbols and never need the standard library declarations.
export function initTestProject(tsConfigFilePath: string): Project {
    return newProject({tsConfigFilePath, skipLoadingLibFiles: true})
}

// A lib-less in-memory project: cheap (no lib.d.ts load), for suites that
// operate on their own in-memory sources. Mirrors the common/init-project
// helper of the same name, but goes through the public entry.
export function initInMemoryProject(compilerOptions?: ProjectOptions["compilerOptions"]): Project {
    return newProject({useInMemoryFileSystem: true, compilerOptions, skipLoadingLibFiles: true})
}
