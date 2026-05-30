// Registry of inspector selectors recognized by `inspect`. Pair with
// src/inspect/refine-inspect.ts (dispatch). Kept separate so parse-args can
// import the list without dragging in ts-morph.

import type {InspectorName} from "ts-refine"

export const inspectorNames: readonly InspectorName[] = ["exports", "importers"] as const
