// onlyInFile is referenced only inside this file, so it should be reported
// with suggestion=unexport (in-file refs exist, external refs none).
export const onlyInFile = 1;
export const externallyUsed = 2;
const _internal = onlyInFile + 1;
console.log(_internal);
