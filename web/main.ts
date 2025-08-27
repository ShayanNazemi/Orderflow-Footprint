type PriceLevel = {
    price_level: number;
    taker_seller: number;
    taker_buyer: number;
};

type FootprintCandle = {
    t: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    footprint: PriceLevel[];
};

const canvas = document.getElementById('chart') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MAIN_BG         = "#0B192C";
const GREEN           = "#16C47F";
const RED             = "#FB4141";
const FADED_GRAY      = "rgba(255, 255, 255, 0.1)";



////////////////////////////////////////////////////////////////////////

// Price axis pan effect
let isDragging = false;
let isPanning  = false;
let isZoomingY = false;
let isZoomingX = false;
let position_start = {x: 0, y:0};

let last_global_p_min: number;
let last_global_p_max: number;
let last_p_ref       : number;

let last_global_t_min: number;
let last_global_t_max: number;
let last_t_ref       : number;


let global_t_min: number;
let global_t_max: number;
let global_p_min: number;
let global_p_max: number;

// Chart layout configs
const MARGIN          = 10;
const X_AXIS_WIDTH    = 40;
const Y_AXIS_WIDTH    = 80;
const MAX_INIT_BARS   = 15;
const CANDLE_WIDTH    = 10;
const WIDTH_VOL_LEVEL = 40;
const INIT_BAR_DIST   = Math.floor(canvas.width / MAX_INIT_BARS);

const N_TICKS_X       = 20;
const N_TICKS_Y       = 20;

let m_x = 1;
let m_y = 1;

let last_m_x: number;
let last_m_y: number;

let dataGlobal: FootprintCandle[];

initCanvas(ctx);


canvas.addEventListener("dblclick", e => {
    initCanvas(ctx);
    onDataFetched(dataGlobal);
})

canvas.addEventListener("mousedown", e => {
    isDragging = true;
    if (isOnXAxis(e)) {
        isZoomingX = true;
    } else if (isOnYAxis(e)) {
        isZoomingY = true;
        last_global_p_min = global_p_min;
        last_global_p_max = global_p_max;
        last_p_ref        = (global_p_max + global_p_min) / 2 ;

        console.log(last_p_ref)
    } else {
        isPanning = true;
    }
    position_start = {x: e.clientX / canvas.width, y: 1 - e.clientY / canvas.height};
});

canvas.addEventListener("mousemove", e => {
    if (!isDragging) return;

    if (isOnXAxis(e) || isZoomingX) {
        const deltaX = e.clientX / canvas.width - position_start.x;
        m_x = last_m_x + deltaX;
        initCanvas(ctx);
        renderChart(dataGlobal); 
    } else if (isOnYAxis(e) || isZoomingY) {
        const deltaY = (1 - e.clientY / canvas.height - position_start.y) / last_m_y;

        m_y = Math.pow(3, deltaY);

        global_p_min = last_p_ref + (last_global_p_min - last_p_ref ) / m_y;
        global_p_max = last_p_ref + (last_global_p_max - last_p_ref) / m_y;

        // last_p_ref        = (global_p_max + global_p_min) / 2 ;

        console.log(last_p_ref, global_p_min.toFixed(3), global_p_max.toFixed(3))

        initCanvas(ctx);
        renderChart(dataGlobal);
    } else {
        const deltaX = (e.clientX / canvas.width - position_start.x) / m_x;
        const deltaY = (1 - e.clientY / canvas.height - position_start.y) / m_y;

        const new_global_t_min = global_t_min - deltaX * (global_t_max - global_t_min);
        const new_global_t_max = global_t_max - deltaX * (global_t_max - global_t_min);
        const new_global_p_min = global_p_min - deltaY * (global_p_max - global_p_min);
        const new_global_p_max = global_p_max - deltaY * (global_p_max - global_p_min);

        global_t_min = new_global_t_min;
        global_t_max = new_global_t_max;
        global_p_min = new_global_p_min;
        global_p_max = new_global_p_max;
        initCanvas(ctx);
        renderChart(dataGlobal); // REDraw
        position_start = {x: e.clientX / canvas.width, y: 1 - e.clientY / canvas.height};
    }
});

canvas.addEventListener("mouseup", () => {
    isDragging = false
    isPanning  = false
    isZoomingX = false
    isZoomingY = false

    last_m_y = m_y;
});
canvas.addEventListener("mouseleave", () => {
    isDragging = false
    isPanning  = false
    isZoomingX = false
    isZoomingY = false
    last_m_y = m_y;
});

////////////////////////////////////////////////////////////////////////
// fetch('http://127.0.0.1:5000/api/orderflow?start=2025-08-24_15:25:00&end=2025-08-24_15:40:00&bin=10')




function onDataFetched(data: FootprintCandle[]) {
    const nCandles = Math.floor(0.75 * canvas.width / (INIT_BAR_DIST));
    const tLast = new Date(data.at(-1)?.t ?? 0).getTime();

    const data_visible = data.slice(data.length - nCandles)
    
    global_t_max = tLast + (MAX_INIT_BARS - nCandles) * 60 * 1000;
    global_t_min = tLast - nCandles * 60 * 1000;

    const p_min = Math.min(...data_visible.map(c => c.low));
    const p_max = Math.max(...data_visible.map(c => c.high));

    global_p_min = Math.floor((p_min - 0.2  * (p_max - p_min)) / 10) * 10;
    global_p_max = Math.ceil((p_max + 0.2  * (p_max - p_min)) / 10) * 10;

    dataGlobal = data;
    renderChart(data);
}




fetch('http://127.0.0.1:5000/api/orderflow?start=2025-08-25_19:25:00&end=2025-08-25_19:50:00&bin=10')
    .then(r => r.json())
    .then((data: FootprintCandle[]) => {
        onDataFetched(data);
    });

function renderChart(data: FootprintCandle[]) {
    data.forEach((candle, i) => {
        ctx.fillStyle = candle.close >= candle.open ? GREEN : RED;
        ctx.strokeStyle = candle.close >= candle.open ? GREEN : RED;
        const t = (new Date(candle.t)).getTime();
        const r_open = transform(t, candle.open, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
        const r_high = transform(t, candle.high, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
        const r_low = transform(t, candle.low, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
        const r_close = transform(t, candle.close, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
        
        const barTop = Math.min(r_open.y, r_close.y), barHeight = Math.abs(r_open.y - r_close.y);
        ctx.fillRect(r_open.x - CANDLE_WIDTH / 2, barTop, CANDLE_WIDTH, barHeight);
        drawLine(ctx, r_high.x, barTop, r_high.x, r_high.y)
        drawLine(ctx, r_low.x, barTop + barHeight, r_low.x, r_low.y)


        candle.footprint.forEach(f => {
            const maxVolSeller = Math.max(...candle.footprint.map(f => f.taker_seller));
            const maxVolBuyer = Math.max(...candle.footprint.map(f => f.taker_buyer));
            const r_level = transform(t, f.price_level, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);

            const alphaSeller = smoothAlphaRange(f.taker_seller / maxVolSeller);
            const alphaBuyer = smoothAlphaRange(f.taker_buyer / maxVolBuyer);
            
            ctx.fillStyle = `rgba(160, 40, 40, ${alphaSeller})`;
            ctx.fillRect(
                r_level.x - f.taker_seller / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL - CANDLE_WIDTH / 2, 
                r_level.y - 10, 
                f.taker_seller / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL, 30);

            ctx.fillStyle = `rgba(15, 120, 80, ${alphaBuyer})`;
            ctx.fillRect(
                r_level.x + CANDLE_WIDTH / 2, 
                r_level.y - 10, 
                f.taker_buyer / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL, 30);


            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.textAlign = 'right';
            ctx.fillText(f.taker_seller, r_level.x - (CANDLE_WIDTH / 2 + 5), r_level.y);

            ctx.textAlign = 'left';
            ctx.fillText(f.taker_buyer, r_level.x + (CANDLE_WIDTH / 2 + 5), r_level.y);

        });
    });

    ////////////////////////////////////////////////////////////////////////

    ctx.fillText(m_y.toFixed(3), 1200, 200)

    ctx.fillStyle = MAIN_BG;
    ctx.fillRect(canvas.width - (Y_AXIS_WIDTH), 0, Y_AXIS_WIDTH, canvas.height)

    // Price axis
    ctx.strokeStyle = FADED_GRAY;
    ctx.fillStyle = "white";

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "12px Arial";

    const y_ticks = linspaceDivisible(global_p_min, global_p_max, 20);

    y_ticks.forEach((p, i) => {
        const r = transform(0, p, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
        ctx.fillText(p.toString(), canvas.width - (Y_AXIS_WIDTH - MARGIN), r.y);
        drawLine(ctx, 0, r.y, canvas.width - Y_AXIS_WIDTH, r.y);
    });

    ctx.strokeStyle = "white";

    

    ////////////////////////////////////////////////////////////////////////

    ctx.fillStyle = MAIN_BG;
    ctx.fillRect(0, canvas.height - X_AXIS_WIDTH, canvas.width, X_AXIS_WIDTH)

    ctx.strokeStyle = FADED_GRAY;
    ctx.fillStyle = "white";

    // The time axis
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.strokeStyle = FADED_GRAY;

    // data.forEach((candle, i) => {
    //     const t = (new Date(candle.t)).getTime();
        // const r = transform(t, 0, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
    //     drawLine(ctx, r.x, 0, r.x, canvas.height - X_AXIS_WIDTH);
    //     const label = new Date(candle.t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    //     ctx.fillText(label, r.x, canvas.height - (X_AXIS_WIDTH - MARGIN)); // 15px from bottom
    // });

    const x_ticks = linspaceDivisible(global_t_min, global_t_max, 60 * 1000);

    x_ticks.forEach((t, i) => {
        const r = transform(new Date(t).getTime(), 0, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
        drawLine(ctx, r.x, 0, r.x, canvas.height - X_AXIS_WIDTH);
        const label = new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        ctx.fillText(label, r.x, canvas.height - (X_AXIS_WIDTH - MARGIN)); // 15px from bottom
    });

    
    ////////////////////////////////////////////////////////////////////////

    ctx.fillStyle = MAIN_BG;
    ctx.fillRect(canvas.width - (Y_AXIS_WIDTH), canvas.height - X_AXIS_WIDTH, Y_AXIS_WIDTH, X_AXIS_WIDTH)

    ctx.strokeStyle = "white";
    drawLine(ctx, 0, canvas.height - X_AXIS_WIDTH, canvas.width, canvas.height - X_AXIS_WIDTH);
    drawLine(ctx, canvas.width - Y_AXIS_WIDTH, 0, canvas.width - Y_AXIS_WIDTH, canvas.height);

    
}

function transform(t: number, p: number, t_min: number, t_max: number, p_min: number, p_max: number, W: number, H: number) {
    return {x: m_x * (t - t_min) / (t_max - t_min) * W, y: H * (1 - m_y * (p - p_min) / (p_max - p_min))}
}

function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function volBarSellerScaler(input: number, vMax: number, x0: number, height: number) {
    return x0 - height / vMax * input
}
function volBarBuyerScaler(input: number, vMax: number, x0: number, height: number) {
    return x0 + height / vMax * input
}

function smoothAlphaRange(x: number): number {
    return 0.1 + (3*x*x - 2*x*x*x) * (0.8);
}

function initCanvas(ctx: CanvasRenderingContext2D) {
    m_x = 1;
    m_y = 1;
    last_m_x = m_x;
    last_m_y = m_y;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = MAIN_BG; // or any color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}


function isOnXAxis(e: MouseEvent) {
    return (canvas.height - X_AXIS_WIDTH) <= e.clientY && e.clientY <= canvas.height && e.clientX <= (canvas.width - Y_AXIS_WIDTH);
}

function isOnYAxis(e: MouseEvent) {
    return (canvas.width - Y_AXIS_WIDTH) <= e.clientX && e.clientX <= canvas.width && e.clientY <= (canvas.height - X_AXIS_WIDTH);
}


function linspace(min: number, max: number, n:number, digits: number) {
    const step = (max - min) / (n + 1);
    return Array.from({ length: n }, (_, i) => +(min + i * step).toFixed(digits));
}

function linspaceDivisible(min: number, max: number, step: number) {
    const start = Math.ceil(min / step) * step;
    const end = Math.floor(max / step) * step;
    const values: number[] = [];
    for (let v = start; v <= end + 1e-10; v += step) values.push(+v);
    return values;
}