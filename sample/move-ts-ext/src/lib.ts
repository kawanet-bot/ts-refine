// Modern type-strip style: `.ts` extension is written explicitly so
// Node can run the file directly without a build step.
export const greet = (name: string): string => `hello, ${name}`
export type Greeter = typeof greet
