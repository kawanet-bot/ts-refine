// ASI-eligible statement kinds: statements whose trailing semicolon is
// optional under Automatic Semicolon Insertion. Shared between the
// semicolons report (count) and the semicolons action (insert/remove).
//
// Excludes interface/class member kinds (PropertySignature etc.) because
// their `;` vs `,` choice is a separate concern.

import {Node} from "ts-morph"

export function isSemiEligibleStatement(node: Node): boolean {
  return Node.isExpressionStatement(node)
    || Node.isVariableStatement(node)
    || Node.isImportDeclaration(node)
    || Node.isImportEqualsDeclaration(node)
    || Node.isExportDeclaration(node)
    || Node.isExportAssignment(node)
    || Node.isTypeAliasDeclaration(node)
    || Node.isReturnStatement(node)
    || Node.isThrowStatement(node)
    || Node.isBreakStatement(node)
    || Node.isContinueStatement(node)
    || Node.isDebuggerStatement(node)
    || Node.isDoStatement(node)
}
