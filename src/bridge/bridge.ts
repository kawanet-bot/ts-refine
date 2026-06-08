// Public entry point for ts-refine's private TypeScript bridge. It exposes the
// small refactor-friendly surface the current codebase uses while keeping the
// implementation backed by the TypeScript compiler and language service.

import * as ts from "typescript"

export {ScriptKind, SyntaxKind} from "typescript"
export type {FormatCodeSettings, Node as TsNode} from "typescript"
export {Node} from "./node.ts"
export {Project} from "./project.ts"
export type {ProjectOptions} from "./project.ts"
export type {Symbol} from "./symbol.ts"
export type {
    AnyNode,
    ClassDeclaration,
    ClassMemberTypes,
    ExportDeclaration,
    Identifier,
    ImportDeclaration,
    InterfaceDeclaration,
    SourceFile,
    StringLiteral,
    TypeElementTypes,
} from "./types.ts"
export {ts}
