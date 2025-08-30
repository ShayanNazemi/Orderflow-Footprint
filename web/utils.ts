export function transform(t: number, p: number, tMin: number, tMax: number, pMin: number, pMax: number, W: number, H: number, mX: number, mY: number) {
    return {x: mX * (t - tMin) / (tMax - tMin) * W, y: H * (1 - mY * (p - pMin) / (pMax - pMin))}
}

export function inverseTransform(x: number, y: number, tMin: number, tMax: number, pMin: number, pMax: number, W: number, H: number, mX: number, mY: number) {
    return {t: x * (tMax - tMin) / (W * mX) + tMin , p: (pMax - pMin) / mY * (1 - y / H) + pMin}
}


export function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

export function drawDashedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.setLineDash([5, 5]); // [dash length, gap length]
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]); // reset to solid line
}

export function linspaceDivisible(min: number, max: number, step: number) {
    const start = Math.ceil(min / step) * step;
    const end = Math.floor(max / step) * step;
    const values: number[] = [];
    for (let v = start; v <= end + 1e-10; v += step) values.push(+v);
    return values;
}

export function smoothAlphaRange(x: number): number {
    return 0.1 + 0.8 * Math.pow(x, 2) * (3  - 2 * x);
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
    return neighbors(baseSize, x < 1 ? lessThanOne: largerThanOne).upper * Math.pow(10, decimal)

} 

export function getClosestTimeInterval(x: number): number {
    if (x <= 0) throw new Error("x must be positive");
    const arrayMin = [ 1, 2, 5, 10, 15, 30, 60, 120, 240, 360, 720, 1440, 7 * 1440 ];
    const arrayMilliSec = arrayMin.map(x => x * 60 * 1000);
    if (x >= arrayMilliSec.at(-1)!) {
        return neighbors(x, arrayMilliSec).lower!;
    }
    return neighbors(x, arrayMilliSec).upper;
}
