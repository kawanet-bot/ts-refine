import type ts from "typescript"
import type {Node} from "./node.ts"
import type {SourceFile as BridgeSourceFile} from "./source-file.ts"

export type AnyNode<T extends ts.Node = ts.Node> = Node<T>
export type SourceFile = BridgeSourceFile
export type Identifier = Node
export type ImportDeclaration = Node<ts.ImportDeclaration>
export type ExportDeclaration = Node<ts.ExportDeclaration>
export type StringLiteral = Node<ts.StringLiteral>
export type InterfaceDeclaration = Node<ts.InterfaceDeclaration>
export type ClassDeclaration = Node<ts.ClassDeclaration>
export type TypeElementTypes = Node
export type ClassMemberTypes = Node
