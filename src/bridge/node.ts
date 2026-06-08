import * as ts from "typescript"
import type {SourceFile} from "./source-file.ts"
import {Symbol as BridgeSymbol} from "./symbol.ts"
import {applyTextChanges} from "./text-change.ts"

// Node wraps a compiler node with the convenience methods ts-refine uses. The class
// is intentionally sparse: methods are added only when ts-refine has a caller.
export class Node<T extends ts.Node = ts.Node> {
    readonly compilerNode: T
    private readonly sourceFile: SourceFile

    constructor(sourceFile: SourceFile, node: T) {
        this.sourceFile = sourceFile
        this.compilerNode = node
    }

    static isImportDeclaration(node: Node | undefined): node is Node<ts.ImportDeclaration> {
        return !!node && ts.isImportDeclaration(node.compilerNode)
    }

    static isExportDeclaration(node: Node | undefined): node is Node<ts.ExportDeclaration> {
        return !!node && ts.isExportDeclaration(node.compilerNode)
    }

    static isStringLiteral(node: Node | undefined): node is Node<ts.StringLiteral> {
        return !!node && ts.isStringLiteral(node.compilerNode)
    }

    static isIdentifier(node: Node | undefined): node is Node<ts.Identifier> {
        return !!node && ts.isIdentifier(node.compilerNode)
    }

    static isNamedImports(node: Node | undefined): node is Node<ts.NamedImports> {
        return !!node && ts.isNamedImports(node.compilerNode)
    }

    static isNamespaceImport(node: Node | undefined): node is Node<ts.NamespaceImport> {
        return !!node && ts.isNamespaceImport(node.compilerNode)
    }

    static isClassDeclaration(node: Node | undefined): node is Node<ts.ClassDeclaration> {
        return !!node && ts.isClassDeclaration(node.compilerNode)
    }

    static isInterfaceDeclaration(node: Node | undefined): node is Node<ts.InterfaceDeclaration> {
        return !!node && ts.isInterfaceDeclaration(node.compilerNode)
    }

    static isFunctionDeclaration(node: Node | undefined): node is Node<ts.FunctionDeclaration> {
        return !!node && ts.isFunctionDeclaration(node.compilerNode)
    }

    static isTypeAliasDeclaration(node: Node | undefined): node is Node<ts.TypeAliasDeclaration> {
        return !!node && ts.isTypeAliasDeclaration(node.compilerNode)
    }

    static isEnumDeclaration(node: Node | undefined): node is Node<ts.EnumDeclaration> {
        return !!node && ts.isEnumDeclaration(node.compilerNode)
    }

    static isModuleDeclaration(node: Node | undefined): node is Node<ts.ModuleDeclaration> {
        return !!node && ts.isModuleDeclaration(node.compilerNode)
    }

    static isVariableDeclaration(node: Node | undefined): node is Node<ts.VariableDeclaration> {
        return !!node && ts.isVariableDeclaration(node.compilerNode)
    }

    static isClassStaticBlockDeclaration(node: Node | undefined): boolean {
        return !!node && ts.isClassStaticBlockDeclaration(node.compilerNode)
    }

    static isReferenceFindable(node: Node | undefined): boolean {
        return !!node && node.referencePosition() != null
    }

    getSourceFile(): SourceFile {
        return this.sourceFile
    }

    getProject() {
        return this.sourceFile.getProject()
    }

    getKind(): ts.SyntaxKind {
        return this.compilerNode.kind
    }

    getKindName(): string {
        return ts.SyntaxKind[this.compilerNode.kind] ?? String(this.compilerNode.kind)
    }

    getText(): string {
        return this.compilerNode.getText(this.sourceFile.compilerNode)
    }

    getStart(): number {
        return this.compilerNode.getStart(this.sourceFile.compilerNode)
    }

    getEnd(): number {
        return this.compilerNode.end
    }

    getWidth(tsSf = this.sourceFile.compilerNode): number {
        return this.compilerNode.getWidth(tsSf)
    }

    replaceWithText(text: string): Node {
        this.sourceFile.replaceText([this.getStart(), this.getEnd()], text)
        return this
    }

    getLastChild(): Node | undefined {
        const children = this.compilerNode.getChildren(this.sourceFile.compilerNode)
        const last = children[children.length - 1]
        return last ? this.sourceFile.wrap(last) : undefined
    }

    getTrailingCommentRanges(): {getKind: () => ts.SyntaxKind}[] {
        const ranges = ts.getTrailingCommentRanges(this.sourceFile.getFullText(), this.getEnd()) ?? []
        return ranges.map((range) => ({getKind: () => range.kind}))
    }

    getParentOrThrow(): Node {
        const parent = this.compilerNode.parent
        if (!parent) throw new Error("Expected parent node")
        return this.sourceFile.wrap(parent)
    }

    getMembers(): Node[] {
        const node = this.compilerNode
        if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeLiteralNode(node)) return node.members.map((m) => this.sourceFile.wrap(m))
        return []
    }

    getBody(): Node | undefined {
        const body = (this.compilerNode as {body?: ts.Node}).body
        return body ? this.sourceFile.wrap(body) : undefined
    }

    getName(): string {
        const name = (this.compilerNode as {name?: ts.PropertyName | ts.BindingName | ts.ModuleName}).name
        return name ? name.getText(this.sourceFile.compilerNode).replace(/^["']|["']$/g, "") : ""
    }

    getNameNode(): Node | undefined {
        const name = (this.compilerNode as {name?: ts.Node}).name
        return name ? this.sourceFile.wrap(name) : undefined
    }

    getSymbol(): BridgeSymbol | undefined {
        const checker = this.getProject().getLanguageService().compilerObject.getProgram()?.getTypeChecker()
        const parsedNode = (this.getNameNode()?.compilerNode ?? this.compilerNode) as ts.Node
        const programNode =
            this.sourceFile.getProgramNodeAtStartWithWidth(parsedNode.kind, parsedNode.getStart(this.sourceFile.compilerNode), parsedNode.getWidth(this.sourceFile.compilerNode)) ?? parsedNode
        const symbol = checker?.getSymbolAtLocation(programNode)
        return symbol ? new BridgeSymbol(this.getProject(), symbol) : undefined
    }

    findReferencesAsNodes(): Node[] {
        const pos = this.referencePosition()
        if (pos == null) return []
        const refs = this.getProject().getLanguageService().compilerObject.findReferences(this.sourceFile.getFilePath(), pos) ?? []
        const out: Node[] = []
        for (const ref of refs) {
            for (const r of ref.references) {
                const sf = this.getProject().getSourceFile(r.fileName)
                const node = sf?.getDescendantAtStartWithWidth(r.textSpan.start, r.textSpan.length) ?? sf?.wrapTokenAt(r.textSpan.start)
                if (node) out.push(node)
            }
        }
        return out
    }

    rename(newName: string): this {
        const pos = this.referencePosition()
        if (pos == null) return this
        const locations = this.getProject().getLanguageService().compilerObject.findRenameLocations(this.sourceFile.getFilePath(), pos, false, false, false) ?? []
        const byFile = new Map<string, ts.TextChange[]>()
        for (const loc of locations) {
            const changes = byFile.get(loc.fileName) ?? []
            changes.push({span: loc.textSpan, newText: `${loc.prefixText ?? ""}${newName}${loc.suffixText ?? ""}`})
            byFile.set(loc.fileName, changes)
        }
        for (const [filePath, changes] of byFile) {
            const sf = this.getProject().getSourceFileOrThrow(filePath)
            sf.replaceWithText(applyTextChanges(sf.getFullText(), changes))
        }
        return this
    }

    getModuleSpecifierValue(): string | undefined {
        const lit = moduleSpecifier(this.compilerNode)
        return lit?.text
    }

    getModuleSpecifierSourceFile(): SourceFile | undefined {
        const spec = this.getModuleSpecifierValue()
        return spec == null ? undefined : this.sourceFile.getProject().resolveModuleSpecifier(this.sourceFile, spec)
    }

    setModuleSpecifier(text: string): this {
        const lit = moduleSpecifier(this.compilerNode)
        if (lit) replaceStringLiteral(this.sourceFile, lit, text)
        return this
    }

    isTypeOnly(): boolean {
        const node = this.compilerNode
        if (ts.isImportDeclaration(node)) return node.importClause?.isTypeOnly ?? false
        return (ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) && node.isTypeOnly
    }

    getImportClause(): Node<ts.ImportClause> | undefined {
        const node = this.compilerNode
        return ts.isImportDeclaration(node) && node.importClause ? this.sourceFile.wrap(node.importClause) : undefined
    }

    getDefaultImport(): Node<ts.Identifier> | undefined {
        const clause = ts.isImportDeclaration(this.compilerNode) ? this.compilerNode.importClause : ts.isImportClause(this.compilerNode) ? this.compilerNode : undefined
        return clause?.name ? this.sourceFile.wrap(clause.name) : undefined
    }

    getNamedBindings(): Node<ts.NamedImportBindings> | undefined {
        const clause = ts.isImportClause(this.compilerNode) ? this.compilerNode : undefined
        return clause?.namedBindings ? this.sourceFile.wrap(clause.namedBindings) : undefined
    }

    getNamespaceImport(): Node<ts.Identifier> | undefined {
        const clause = ts.isImportDeclaration(this.compilerNode) ? this.compilerNode.importClause : undefined
        const named = clause?.namedBindings
        return named && ts.isNamespaceImport(named) ? this.sourceFile.wrap(named.name) : undefined
    }

    getNamedImports(): Node<ts.ImportSpecifier>[] {
        const clause = ts.isImportDeclaration(this.compilerNode) ? this.compilerNode.importClause : undefined
        const named = clause?.namedBindings
        return named && ts.isNamedImports(named) ? named.elements.map((el) => this.sourceFile.wrap(el)) : []
    }

    getNamedExports(): Node<ts.ExportSpecifier>[] {
        const node = this.compilerNode
        if (!ts.isExportDeclaration(node) || !node.exportClause || !ts.isNamedExports(node.exportClause)) return []
        return node.exportClause.elements.map((el) => this.sourceFile.wrap(el))
    }

    getElements(): Node[] {
        const node = this.compilerNode
        if (ts.isNamedImports(node) || ts.isNamedExports(node)) return node.elements.map((el) => this.sourceFile.wrap(el))
        return []
    }

    getNamespaceExport(): Node<ts.NamespaceExport> | undefined {
        const node = this.compilerNode
        return ts.isExportDeclaration(node) && node.exportClause && ts.isNamespaceExport(node.exportClause) ? this.sourceFile.wrap(node.exportClause) : undefined
    }

    getAliasNode(): Node | undefined {
        const prop = (this.compilerNode as {propertyName?: ts.Node}).propertyName
        return prop ? this.sourceFile.wrap(prop) : undefined
    }

    getNameNodeOrThrow(): Node {
        const node = this.getNameNode()
        if (!node) throw new Error("Expected name node")
        return node
    }

    getLiteralValue(): string {
        const node = this.compilerNode
        return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : this.getText()
    }

    setLiteralValue(value: string): this {
        const node = this.compilerNode
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) replaceStringLiteral(this.sourceFile, node, value)
        return this
    }

    getExpression(): Node {
        const expr = (this.compilerNode as {expression?: ts.Node}).expression
        if (!expr) throw new Error("Expected expression")
        return this.sourceFile.wrap(expr)
    }

    getArguments(): Node[] {
        const args = (this.compilerNode as {arguments?: ts.NodeArray<ts.Expression>}).arguments
        return args ? args.map((arg) => this.sourceFile.wrap(arg)) : []
    }

    getDeclarations(): Node<ts.VariableDeclaration>[] {
        const node = this.compilerNode
        return ts.isVariableStatement(node) ? node.declarationList.declarations.map((decl) => this.sourceFile.wrap(decl)) : []
    }

    getVariableStatement(): Node<ts.VariableStatement> | undefined {
        let node: ts.Node | undefined = this.compilerNode
        while (node && !ts.isVariableStatement(node)) node = node.parent
        return node ? this.sourceFile.wrap(node) : undefined
    }

    getDeclarationKind(): string {
        const node = this.compilerNode
        if (!ts.isVariableStatement(node)) return "var"
        if (node.declarationList.flags & ts.NodeFlags.Const) return "const"
        if (node.declarationList.flags & ts.NodeFlags.Let) return "let"
        return "var"
    }

    referencePosition(): number | undefined {
        const name = this.getNameNode()
        if (name) return name.getStart()
        if (ts.isIdentifier(this.compilerNode) || ts.isStringLiteral(this.compilerNode) || ts.isPrivateIdentifier(this.compilerNode)) return this.getStart()
        return undefined
    }
}

function moduleSpecifier(node: ts.Node): ts.StringLiteral | undefined {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) return node.moduleSpecifier
    return undefined
}

function replaceStringLiteral(sf: SourceFile, lit: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral, value: string): void {
    sf.replaceText([lit.getStart(sf.compilerNode) + 1, lit.end - 1], escapeString(value, lit.getText(sf.compilerNode)[0]))
}

function escapeString(value: string, quote: string): string {
    return value.replaceAll("\\", "\\\\").replaceAll(quote, "\\" + quote)
}
