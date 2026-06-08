import {usedConst, usedFn} from "./used.js"
import {externallyUsed} from "./partial.js"

console.log(usedConst, usedFn(), externallyUsed);
