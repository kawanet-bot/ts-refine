// Importers in this project keep the explicit `.ts` extension. After
// `ts-survey move`, the rewritten specifier stays `.ts`-suffixed because
// each importer's original style is preserved.
import {greet, type Greeter} from "./lib.ts"

const speak: Greeter = greet
console.log(speak("world"))
