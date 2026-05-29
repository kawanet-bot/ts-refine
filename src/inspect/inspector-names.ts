// Registry of inspector selectors recognized by `inspect`. Pair with
// src/inspect/run-inspect.ts (dispatch). Kept separate so parse-args can
// import the list without dragging in ts-morph.

import type {InspectorName} from "@kawanet/ts-survey"

export const inspectorNames: readonly InspectorName[] = ["exports", "importers"] as const
