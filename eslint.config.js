// ESLint loads this .js entry directly, so it does not require `jiti`
// to read a TypeScript config. The typed config lives in builder/ where
// tsconfig already type-checks it; Node's native type stripping loads
// the .ts when this file re-exports it.
export {default} from "./builder/eslint.config.ts"
