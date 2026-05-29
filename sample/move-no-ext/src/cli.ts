// Importers in this project write no extension. After `ts-survey move`,
// the rewritten specifier still has no extension — no `.ts` injected.
import {greet, type Greeter} from "./lib"

const speak: Greeter = greet
console.log(speak("world"))
