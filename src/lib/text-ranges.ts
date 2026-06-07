// Fast source-text range checks shared by formatter passes. These helpers avoid
// allocating node text when only trivia/line-break presence is needed.

export function hasLineBreakBetween(text: string, from: number, to: number): boolean {
    if (from >= to) return false
    const lf = text.indexOf("\n", from)
    if (lf >= 0 && lf < to) return true
    const cr = text.indexOf("\r", from)
    return cr >= 0 && cr < to
}
