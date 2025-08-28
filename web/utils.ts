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