import * as ts from "typescript"
import type {Node} from "./node.ts"
import type {Project} from "./project.ts"

// Symbol is a narrow TypeChecker-backed wrapper. It gives resolve-target just
// enough export/member traversal without exposing raw compiler internals.
export class Symbol {
    private readonly project: Project
    private readonly symbol: ts.Symbol

    constructor(project: Project, symbol: ts.Symbol) {
        this.project = project
        this.symbol = symbol
    }

    getDeclarations(): Node[] {
        return (this.symbol.getDeclarations() ?? []).map((decl) => this.project.getOrCreateSourceFile(decl.getSourceFile().fileName).wrap(decl))
    }

    getExport(name: string): Symbol | undefined {
        const escaped = name as ts.__String
        const found = this.symbol.exports?.get(escaped)
        return found ? new Symbol(this.project, found) : this.getTypeProperty(name)
    }

    getMember(name: string): Symbol | undefined {
        const escaped = name as ts.__String
        const found = this.symbol.members?.get(escaped)
        return found ? new Symbol(this.project, found) : this.getTypeProperty(name)
    }

    getAliasedSymbol(): Symbol | undefined {
        const checker = this.project.getLanguageService().compilerObject.getProgram()?.getTypeChecker()
        if (!checker || !(this.symbol.flags & ts.SymbolFlags.Alias)) return undefined
        return new Symbol(this.project, checker.getAliasedSymbol(this.symbol))
    }

    private getTypeProperty(name: string): Symbol | undefined {
        const checker = this.project.getLanguageService().compilerObject.getProgram()?.getTypeChecker()
        const decl = this.symbol.getDeclarations()?.[0]
        if (!checker || !decl) return undefined
        const prop = checker.getDeclaredTypeOfSymbol(this.symbol).getProperty(name) ?? checker.getTypeOfSymbolAtLocation(this.symbol, decl).getProperty(name)
        return prop ? new Symbol(this.project, prop) : undefined
    }
}
