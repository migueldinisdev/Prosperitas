/** Arithmetic over the decimal representations stored in JSON, without dropping
 * significant digits or introducing binary subtraction dust. Persistence still
 * uses numbers; BigInt is only an intermediate representation. */
const parts = (value: number): { coefficient: bigint; scale: number } => {
    const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
    const [integer, fraction = ''] = mantissa.split('.');
    return { coefficient: BigInt(integer + fraction), scale: fraction.length - Number(exponent) };
};

export const decimalSum = (a: number, b: number) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a + b;
    const left = parts(a), right = parts(b);
    const scale = Math.max(left.scale, right.scale);
    const coefficient = left.coefficient * 10n ** BigInt(scale - left.scale) +
        right.coefficient * 10n ** BigInt(scale - right.scale);
    return Number(`${coefficient}e${-scale}`);
};

export const decimalProduct = (a: number, b: number) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a * b;
    const left = parts(a), right = parts(b);
    return Number(`${left.coefficient * right.coefficient}e${-(left.scale + right.scale)}`);
};
