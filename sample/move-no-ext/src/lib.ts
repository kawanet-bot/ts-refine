// Classic Node10 resolution: importers omit the extension entirely and
// the resolver locates the .ts source via extension search.
export const greet = (name: string): string => `hello, ${name}`
export type Greeter = typeof greet
