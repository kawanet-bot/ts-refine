// Importers in this project use the emit-style `.js` extension. After
// `ts-survey move`, the rewritten specifier keeps `.js` — no migration
// to `.ts`.
import {greet, type Greeter} from "./lib.js"

const speak: Greeter = greet
console.log(speak("world"))
