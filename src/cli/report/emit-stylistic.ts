// `--emit stylistic`: render report recommendations as an ESLint flat-config
// JSON object for @stylistic/eslint-plugin. The output is JSON only; callers
// still need to install/register the plugin in their eslint.config.* file.

import type {RuleOptions} from "@stylistic/eslint-plugin"
import type {Linter} from "eslint"
import type {TSR} from "ts-refine"

type StylisticRules = {
    [K in keyof RuleOptions]?: Linter.RuleEntry<RuleOptions[K]>
}

interface StylisticConfig {
    rules: StylisticRules
}

const compactJSON = (value: unknown): string =>
    JSON.stringify(value, null, 2).replace(/\[.*?\]/gs, (match) => match.replace(/([\[{]?)\n *([\]}]?)/g, (_, open: string, close: string) => open || close || " "))

function memberDelimiterConfig(delimiter: TSR.MemberDelimiterReport["delimiter"]): Linter.RuleEntry<RuleOptions["@stylistic/member-delimiter-style"]> {
    return [
        "error",
        {
            multiline: {delimiter, requireLast: true},
            singleline: {delimiter: delimiter === "none" ? "semi" : delimiter, requireLast: delimiter !== "none"},
        },
    ]
}

function buildStylisticRules(report: TSR.ReportResult): StylisticRules {
    const rules: StylisticRules = {}
    if (report.semi?.semi === "on") rules["@stylistic/semi"] = ["error", "always"]
    else if (report.semi?.semi === "off") rules["@stylistic/semi"] = ["error", "never"]
    if (report.indent?.width != null) rules["@stylistic/indent"] = ["error", report.indent.width]
    if (report.memberDelimiter?.delimiter) rules["@stylistic/member-delimiter-style"] = memberDelimiterConfig(report.memberDelimiter.delimiter)
    if (report.newLine?.newLine === "lf") rules["@stylistic/linebreak-style"] = ["error", "unix"]
    else if (report.newLine?.newLine === "crlf") rules["@stylistic/linebreak-style"] = ["error", "windows"]
    if (report.bracketSpacing?.bracketSpacing === "on") rules["@stylistic/object-curly-spacing"] = ["error", "always"]
    else if (report.bracketSpacing?.bracketSpacing === "off") rules["@stylistic/object-curly-spacing"] = ["error", "never"]
    if (report.trailingComma?.trailingComma === "on") rules["@stylistic/comma-dangle"] = ["error", "always-multiline"]
    else if (report.trailingComma?.trailingComma === "off") rules["@stylistic/comma-dangle"] = ["error", "never"]
    return rules
}

export function getStylisticConfig(report: TSR.ReportResult): string {
    const config: StylisticConfig = {rules: buildStylisticRules(report)}
    return compactJSON(config)
}

export function emitStylisticConfig(report: TSR.ReportResult, output: TSR.Writer): void {
    output.write(getStylisticConfig(report) + "\n")
}

export function writeStylisticMarkdown(report: TSR.ReportResult, output: TSR.Writer): void {
    const config = getStylisticConfig(report)
    if (config === "{\n  \"rules\": {}\n}") return
    output.write("### @stylistic/eslint-plugin\n")
    output.write("\n")
    output.write("```json\n")
    output.write(config + "\n")
    output.write("```\n")
    output.write("\n")
}
