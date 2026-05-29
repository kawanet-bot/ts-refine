// tsc-emit style: the source is .ts, but importers reference the file
// under its emitted `.js` name (NodeNext resolution finds the .ts source).
export const greet = (name: string): string => `hello, ${name}`
export type Greeter = typeof greet
