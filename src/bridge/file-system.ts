import fs from "node:fs"
import path from "node:path"

// Shared filesystem façade for disk-backed and in-memory projects. It is tiny
// on purpose: only methods currently exercised by ts-refine are implemented.
export class BridgeFileSystem {
    private readonly files?: Map<string, string>

    constructor(files?: Map<string, string>) {
        this.files = files
    }

    fileExistsSync(filePath: string): boolean {
        const p = normalizePath(filePath)
        return this.files ? this.files.has(p) : fs.existsSync(p)
    }

    directoryExistsSync(dirPath: string): boolean {
        const p = normalizePath(dirPath)
        if (!this.files) return fs.existsSync(p) && fs.statSync(p).isDirectory()
        const prefix = p.endsWith("/") ? p : p + "/"
        for (const filePath of this.files.keys()) if (filePath.startsWith(prefix)) return true
        return false
    }

    readFileSync(filePath: string): string {
        const p = normalizePath(filePath)
        if (this.files) return this.files.get(p) ?? ""
        return fs.readFileSync(p, "utf8")
    }

    writeFileSync(filePath: string, text: string): void {
        const p = normalizePath(filePath)
        if (this.files) {
            this.files.set(p, text)
            return
        }
        fs.mkdirSync(path.dirname(p), {recursive: true})
        fs.writeFileSync(p, text)
    }

    async delete(filePath: string): Promise<void> {
        const p = normalizePath(filePath)
        if (this.files) {
            this.files.delete(p)
            return
        }
        await fs.promises.rm(p, {force: true})
    }
}

// Keeps cache keys stable across POSIX paths and TypeScript's fileName values.
export function normalizePath(filePath: string): string {
    return path.resolve(filePath).replaceAll(path.sep, "/")
}
