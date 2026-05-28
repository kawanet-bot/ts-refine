// Class properties use `;` while the method body ends with `}` and must
// be skipped (no separator choice to record).
export class WithClass {
    field: number = 0;
    other: string = "";
    method(): number {
        return this.field;
    }
}
