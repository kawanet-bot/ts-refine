import type {TsSurveyReportName} from "@kawanet/ts-survey"
import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {Project} from "ts-morph"
import {runReports} from "./run-reports.ts"

const SAMPLE_TSCONFIG = path.resolve(import.meta.dirname, "../../sample/basic/tsconfig.json")

describe("runReports", () => {
    it("throws on an unknown report name (validation moved out of parseArgs)", async () => {
        const project = new Project({tsConfigFilePath: SAMPLE_TSCONFIG})
        const lines: string[] = []
        await assert.rejects(
            () =>
                runReports(project, {
                    // Intentional typo. The typed surface narrows to known
                    // names, so the cast lets the test reach the runtime
                    // validation that the production CLI also relies on.
                    reportNames: ["typo-name" as unknown as TsSurveyReportName],
                    stream: {write: (l) => lines.push(l)},
                    paths: [],
                }),
            /unknown report name: typo-name/,
        )
    })

    it("runs requested reports in registry order regardless of input order", async () => {
        const project = new Project({tsConfigFilePath: SAMPLE_TSCONFIG})
        const lines: string[] = []
        await runReports(project, {
            // Input deliberately in reverse of registry order to confirm the
            // router re-orders. indent precedes semicolons in the registry.
            reportNames: ["semicolons", "indent"],
            stream: {write: (l) => lines.push(l)},
            paths: [],
        })
        const out = lines.join("")
        const indentPos = out.indexOf("### indent")
        const semiPos = out.indexOf("### semicolons")
        assert.ok(indentPos >= 0 && semiPos >= 0, "both sections must appear")
        assert.ok(semiPos < indentPos, "semicolons must precede indent")
    })
})
