export function transform(t: number, p: number, t_min: number, t_max: number, p_min: number, p_max: number, W: number, H: number, m_x: number, m_y: number) {
    return {x: m_x * (t - t_min) / (t_max - t_min) * W, y: H * (1 - m_y * (p - p_min) / (p_max - p_min))}
}

export function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

export function linspaceDivisible(min: number, max: number, step: number) {
    const start = Math.ceil(min / step) * step;
    const end = Math.floor(max / step) * step;
    const values: number[] = [];
    for (let v = start; v <= end + 1e-10; v += step) values.push(+v);
    return values;
}

export function smoothAlphaRange(x: number): number {
    return 0.1 + (3*x*x - 2*x*x*x) * (0.8);
}

export function round(x: number, digits: number): number {
    if (digits >= 0) {
        return parseFloat(x.toFixed(digits));
    } else {
        return Math.floor(x / Math.pow(10, -digits)) * Math.pow(10, -digits);
    }

}

function neighbors(x: number, A: number[]) {
    let lower;
    let upper;

    for (let i = 0; i < A.length; i++) {
        if (A[i]! <= x) lower = A[i]!;
        if (A[i]! > x) {
            upper = A[i]!;
            break;
        }
    }

    if (upper == undefined) {
        upper = A[0]! * 10;
    }

    return { lower, upper };
}

export function getClosestTickSize(x: number) {
    if (x <= 0) throw new Error("x must be positive");

    const lessThanOne = [1, 2, 5];
    const largerThanOne = [1, 2, 2.5, 4, 5];
    const decimal = Math.floor(Math.log10(x));

    const baseSize = x / Math.pow(10, decimal);

    const values = neighbors(baseSize, x < 1 ? lessThanOne: largerThanOne);
    return {lower: values.lower! * Math.pow(10, decimal), upper: values.upper * Math.pow(10, decimal)} 

} 

export function getNextTickSize(size: number) {
    if (size <= 0) throw new Error("Size must be positive");

    const lessThanOne = [1, 2, 5];
    const largerThanOne = [1, 2, 2.5, 4, 5];
    const decimal = Math.floor(Math.log10(size));

    const baseSize = size / Math.pow(10, decimal);
    let index;
    if (size < 1) {
        if (lessThanOne.includes(baseSize)) {
            index = lessThanOne.indexOf(baseSize);
            return index == lessThanOne.length - 1 ? lessThanOne[0]! * Math.pow(10, decimal + 1) : lessThanOne[index + 1]! * Math.pow(10, decimal);
        } else return undefined
    } else {
        if (largerThanOne.includes(baseSize)) {
            index = largerThanOne.indexOf(baseSize);
            return index == largerThanOne.length - 1 ? largerThanOne[0]! * Math.pow(10, decimal + 1) : largerThanOne[index + 1]! * Math.pow(10, decimal);
        } else return undefined;
    }
}


export function getPriceTickSize(priceRange: number) {

}