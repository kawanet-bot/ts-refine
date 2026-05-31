// Output sink shared by the command runners. They type their stream as the
// published TSR.Writer; this module just provides NULL_SINK, which the write
// commands route the report Markdown they don't print into.

import type {TSR} from "ts-refine"

// Swallows the Markdown stream in the write modes; the runner consumes it.
export const NULL_SINK: TSR.Writer = {write: () => {}}
