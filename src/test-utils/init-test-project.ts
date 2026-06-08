// Test project factory. Pins skipLoadingLibFiles: true — the refactoring suites
// operate on their own source symbols and never need the standard library
// declarations, so skipping the lib.d.ts load makes the program build
// dramatically cheaper. Test-only: production must keep the libs for correct
// semantics on real projects. (The in-memory factory moved to common/init-project.)

import {ModuleKind, ModuleResolutionKind} from "typescript"
import {Project, type ProjectOptions} from "../bridge/bridge.ts"

// Builds a project from a tsconfig on disk (sample fixtures, on-disk cases).
export function initTestProject(tsConfigFilePath: string): Project {
    return new Project({tsConfigFilePath, skipLoadingLibFiles: true})
}

// Builds the semantic in-memory project shape used by bridge smoke tests.
// The tests need TS-extension import resolution, but not standard-library
// declarations.
export function initBridgeTestProject(compilerOptions: ProjectOptions["compilerOptions"] = {}): Project {
    return new Project({
        compilerOptions: {
            allowImportingTsExtensions: true,
            module: ModuleKind.ESNext,
            moduleResolution: ModuleResolutionKind.Bundler,
            ...compilerOptions,
        },
        skipLoadingLibFiles: true,
        useInMemoryFileSystem: true,
    })
}
