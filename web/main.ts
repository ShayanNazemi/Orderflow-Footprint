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
const green = "#16C47F";
const red   = "#FB4141";
const fadedGray = "rgba(255, 255, 255, 0.1)";

initCanvas(ctx);

////////////////////////////////////////////////////////////////////////

// Price axis pan effect
let isDragging = false;
let position_start = {x: 0, y:0};
// let priceOffset = 0;

// let priceMinGlobal = 0;
// let priceMaxGlobal = 0;

let dataGlobal: FootprintCandle[];

canvas.addEventListener("mousedown", e => {
    isDragging = true;
    position_start = {x: e.clientX / canvas.width, y: 1 - e.clientY / canvas.height};
});

canvas.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const deltaX = e.clientX / canvas.width - position_start.x;
    const deltaY = 1 - e.clientY / canvas.height - position_start.y;

    const new_global_t_min = global_t_min - deltaX * (global_t_max - global_t_min);
    const new_global_t_max = global_t_max - deltaX * (global_t_max - global_t_min);
    const new_global_p_min = global_p_min - deltaY * (global_p_max - global_p_min);
    const new_global_p_max = global_p_max - deltaY * (global_p_max - global_p_min);

    global_t_min = new_global_t_min;
    global_t_max = new_global_t_max;
    global_p_min = new_global_p_min;
    global_p_max = new_global_p_max;
    initCanvas(ctx);
    renderChart(dataGlobal); // redraw
    position_start = {x: e.clientX / canvas.width, y: 1 - e.clientY / canvas.height};

});

canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mouseleave", () => isDragging = false);

////////////////////////////////////////////////////////////////////////
// fetch('http://127.0.0.1:5000/api/orderflow?start=2025-08-24_15:25:00&end=2025-08-24_15:40:00&bin=10')





let global_t_min: number;
let global_t_max: number;
let global_p_min: number;
let global_p_max: number;

// Chart layout configs
const MARGIN        = 10;
const AXIS_WIDTH    = 60;
const MAX_INIT_BARS = 10;
const CANDLE_WIDTH  = 10;
const WIDTH_VOL_LEVEL     = 40;



fetch('http://127.0.0.1:5000/api/orderflow?start=2025-08-24_15:25:00&end=2025-08-24_15:40:00&bin=10')
    .then(r => r.json())
    .then((data: FootprintCandle[]) => {
        global_p_min = Math.floor(Math.min(...data.map(c => c.low)) / 10) * 10;
        global_p_max = Math.ceil(Math.max(...data.map(c => c.high)) / 10) * 10;

        global_t_max = Math.max(...data.map(c => (new Date(c.t)).getTime())) + 60 * 1000

        if (data.length > MAX_INIT_BARS) {
            global_t_min = global_t_max - MAX_INIT_BARS * 60 * 1000;
        } else {
            global_t_min = Math.min(...data.map(c => (new Date(c.t)).getTime())) - 60 * 1000
        }

        dataGlobal = data;
        renderChart(data);
    });

function renderChart(data: FootprintCandle[]) {
    const candleWidth = 10, gap = 100, volBar = 40;
    // const priceMin = Math.min(...data.map(c => c.low));
    // const priceMax = Math.max(...data.map(c => c.high));

    ////////////////////////////////////////////////////////////////////////

    // Price axis
    ctx.strokeStyle = fadedGray;
    ctx.fillStyle = "white";

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "12px Arial";

    for (let p = global_p_min; p <= global_p_max; p+= 10) {
        const r = transform(0, p, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
        ctx.fillText(p.toString(), canvas.width - (AXIS_WIDTH - MARGIN), r.y);
        drawLine(ctx, 0, r.y, canvas.width - AXIS_WIDTH, r.y);
    }
    ctx.strokeStyle = "white";
    drawLine(ctx, canvas.width - AXIS_WIDTH, 0, canvas.width - AXIS_WIDTH, canvas.height);

    ////////////////////////////////////////////////////////////////////////

    // The time axis
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.strokeStyle = fadedGray;

    data.forEach((candle, i) => {
        const t = (new Date(candle.t)).getTime();
        const r = transform(t, 0, global_t_min, global_t_max, global_p_min, global_p_max, canvas.width, canvas.height);
        drawLine(ctx, r.x, 0, r.x, canvas.height - AXIS_WIDTH);
        const label = new Date(candle.t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        ctx.fillText(label, r.x, canvas.height - (AXIS_WIDTH - MARGIN)); // 15px from bottom
    });
    ctx.strokeStyle = "white";
    drawLine(ctx, 0, canvas.height - AXIS_WIDTH, canvas.width, canvas.height - AXIS_WIDTH);

    ////////////////////////////////////////////////////////////////////////
    

    data.forEach((candle, i) => {
        ctx.fillStyle = candle.close >= candle.open ? green : red;
        ctx.strokeStyle = candle.close >= candle.open ? green : red;
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
}

function transform(t: number, p: number, t_min: number, t_max: number, p_min: number, p_max: number, W: number, H: number) {
    return {x: (t - t_min) / (t_max - t_min) * W, y: H * (1 - (p - p_min) / (p_max - p_min))}
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0B192C"; // or any color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}