import * as ts from "typescript"
import type {Node} from "./node.ts"
import type {Project} from "./project.ts"
import type {SourceFile} from "./source-file.ts"
import {CombinedCodeActions, FileTextChanges} from "./text-change.ts"

// Thin wrapper around TypeScript's LanguageService. Keeping it here lets
// SourceFile and refactor code share one edit-application path.
export class LanguageService {
    readonly compilerObject: ts.LanguageService
    private readonly project: Project

    constructor(project: Project) {
        this.project = project
        this.compilerObject = ts.createLanguageService(this.createHost())
    }

    findRenameLocations(node: Node, options: {renameInStrings?: boolean; renameInComments?: boolean; usePrefixAndSuffixText?: boolean} = {}): RenameLocation[] {
        const locations =
            this.compilerObject.findRenameLocations(
                node.getSourceFile().getFilePath(),
                node.getStart(),
                options.renameInStrings ?? false,
                options.renameInComments ?? false,
                options.usePrefixAndSuffixText ?? false,
            ) ?? []
        return locations.map((loc) => new RenameLocation(this.project, loc))
    }

    organizeImports(sf: SourceFile, formatSettings: ts.FormatCodeSettings = {}, userPreferences: ts.UserPreferences = {}): FileTextChanges[] {
        const changes = this.compilerObject.organizeImports({type: "file", fileName: sf.getFilePath()}, filledSettings(formatSettings), userPreferences)
        return changes.map((change) => new FileTextChanges(this.project, change))
    }

    getCombinedCodeFix(sf: SourceFile, fixId: {}, formatSettings: ts.FormatCodeSettings = {}, preferences: ts.UserPreferences = {}): CombinedCodeActions {
        const actions = this.compilerObject.getCombinedCodeFix({type: "file", fileName: sf.getFilePath()}, fixId, filledSettings(formatSettings), preferences)
        return new CombinedCodeActions(this.project, actions)
    }

    getFormattingEditsForDocument(sf: SourceFile, settings: ts.FormatCodeSettings): readonly ts.TextChange[] {
        return this.compilerObject.getFormattingEditsForDocument(sf.getFilePath(), filledSettings(settings))
    }

    getEditsForFileRename(oldPath: string, newPath: string, formatSettings: ts.FormatCodeSettings = {}, preferences: ts.UserPreferences = {}): readonly ts.FileTextChanges[] {
        return this.compilerObject.getEditsForFileRename(oldPath, newPath, filledSettings(formatSettings), preferences)
    }

    private createHost(): ts.LanguageServiceHost {
        return {
            getCompilationSettings: () => this.project.getCompilerOptions(),
            getCurrentDirectory: () => this.project.getCurrentDirectory(),
            getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
            getScriptFileNames: () => this.project.getScriptFileNames(),
            getScriptSnapshot: (fileName) => {
                if (!this.project.fileExists(fileName)) return undefined
                return ts.ScriptSnapshot.fromString(this.project.readFileText(fileName))
            },
            getScriptVersion: (fileName) => this.project.getScriptVersion(fileName),
            readDirectory: ts.sys.readDirectory,
            readFile: (fileName) => this.project.readFileText(fileName),
            fileExists: (fileName) => this.project.fileExists(fileName),
            directoryExists: ts.sys.directoryExists,
        }
    }
}

// TypeScript's raw language service does not fill the editor defaults for API
// callers. The bridge restores TypeScript's defaults before every
// formatter/code-fix entry point.
function filledSettings(settings: ts.FormatCodeSettings): ts.FormatCodeSettings {
    return {...ts.getDefaultFormatCodeSettings(), ...settings}
}

// Rename locations expose the text-span accessors used by the old wrapper's
// rename manipulator, including optional prefix/suffix text from TS.
export class RenameLocation {
    private readonly project: Project
    private readonly location: ts.RenameLocation

    constructor(project: Project, location: ts.RenameLocation) {
        this.project = project
        this.location = location
    }

    getSourceFile(): SourceFile {
        return this.project.getSourceFileOrThrow(this.location.fileName)
    }

    getTextSpan(): TextSpan {
        return new TextSpan(this.location.textSpan)
    }

    getPrefixText(): string | undefined {
        return this.location.prefixText
    }

    getSuffixText(): string | undefined {
        return this.location.suffixText
    }
}

// Small span wrapper preserves start/end method names for callers
// that group and apply rename edits.
export class TextSpan {
    private readonly span: ts.TextSpan

    constructor(span: ts.TextSpan) {
        this.span = span
    }

    getStart(): number {
        return this.span.start
    }

    getEnd(): number {
        return this.span.start + this.span.length
    }
}
