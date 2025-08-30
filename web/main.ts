import { CanvasState, FootprintCandle, PriceLevel } from "./types";
import { setState, setPrevState, INIT_STATE } from "./state";
import { drawLine, linspaceDivisible, round, smoothAlphaRange, transform, getClosestTickSize, getClosestTimeInterval } from "./utils";

import { BRIGHT_BG, MAIN_BG, GREEN, DARK_RED, RED, FADED_GRAY, MARGIN, X_AXIS_WIDTH, Y_AXIS_WIDTH, MAX_INIT_BARS, CANDLE_WIDTH, WIDTH_VOL_LEVEL, DARK_GREEN } from "./constants";


const canvas = document.getElementById('chart') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const overlayCanvas = document.getElementById('overlay') as HTMLCanvasElement;
const overlayCtx = overlayCanvas.getContext('2d')!;
overlayCanvas.width = window.innerWidth;
overlayCanvas.height = window.innerHeight;

const VOL_BAR_HEIGHT = 10;

const INIT_TICK_X = 20;
const INIT_TICK_Y = 20;

const VOL_PROFILE_HEIGHT = 30;


let state: CanvasState = { ...INIT_STATE };
let prevState: CanvasState = { ...state };

initCanvas(ctx);

fetch('http://127.0.0.1:5000/api/orderflow?start=2025-08-25_16:20:00&end=2025-08-25_17:31:00&bin=10')
    .then(r => r.json())
    .then((data: FootprintCandle[]) => {
        onDataFetched(data);
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Mouse Event Listeners
function isOnXAxis(e: MouseEvent) {
    return (canvas.height - X_AXIS_WIDTH) <= e.clientY && e.clientY <= canvas.height && e.clientX <= (canvas.width - Y_AXIS_WIDTH);
}

function isOnYAxis(e: MouseEvent) {
    return (canvas.width - Y_AXIS_WIDTH) <= e.clientX && e.clientX <= canvas.width && e.clientY <= (canvas.height - X_AXIS_WIDTH);
}

canvas.addEventListener("dblclick", e => {
    initCanvas(ctx);

    onDataFetched(state.data);
})

canvas.addEventListener("mousedown", e => {
    if (isOnXAxis(e)) {
        state = setState(state, { isZoomingX : true })
        prevState = setPrevState(prevState, { t_min: state.t_min, t_max: state.t_max, t_ref: (state.t_min + state.t_max) / 2})
    } else if (isOnYAxis(e)) {
        state = setState(state, { isZoomingY : true })
        prevState = setPrevState(prevState, { p_min: state.p_min, p_max: state.p_max, p_ref: (state.p_min + state.p_max) / 2})
    } else {
        state = setState(state, { isPanning : true })
    }
    state = setState(state, { isDragging : true, init_position: {x: e.clientX / canvas.width, y: 1 - e.clientY / canvas.height} })
});

canvas.addEventListener("mousemove", e => {
    if (!state.isDragging) return;

    if (isOnXAxis(e) || state.isZoomingX) {
        const deltaX = (e.clientX / canvas.width - state.init_position.x) / prevState.m_x;
        const m_x = Math.pow(3, deltaX);
        state = setState(state, { 
            m_x: m_x,
            t_min: prevState.t_ref + (prevState.t_min - prevState.t_ref) / m_x,
            t_max: prevState.t_ref + (prevState.t_max - prevState.t_ref) / m_x
        });

        const intervalSize = getClosestTimeInterval((state.t_max - state.t_min) / INIT_TICK_X);
        state = setState(state, { tick_x: intervalSize });

        initCanvas(ctx);
        renderChart(state.data);
    } else if (isOnYAxis(e) || state.isZoomingY) {
        const deltaY = (1 - e.clientY / canvas.height - state.init_position.y) / prevState.m_y;
        const m_y = Math.pow(3, deltaY);
        state = setState(state, { 
            m_y: m_y,
            p_min: prevState.p_ref + (prevState.p_min - prevState.p_ref) / m_y,
            p_max: prevState.p_ref + (prevState.p_max - prevState.p_ref) / m_y
        });
        
        const tickSize = getClosestTickSize((state.p_max - state.p_min) / INIT_TICK_Y);
        state = setState(state, { tick_y: tickSize });

        initCanvas(ctx);
        renderChart(state.data);
    } else {
        const deltaX = (e.clientX / canvas.width - state.init_position.x) / state.m_x;
        const deltaY = (1 - e.clientY / canvas.height - state.init_position.y) / state.m_y;

        state = setState(state, {
            t_min: state.t_min - deltaX * (state.t_max - state.t_min),
            t_max: state.t_max - deltaX * (state.t_max - state.t_min),
            p_min: state.p_min - deltaY * (state.p_max - state.p_min),
            p_max: state.p_max - deltaY * (state.p_max - state.p_min)
        })

        initCanvas(ctx);
        renderChart(state.data); // REDraw

        state = setState(state, { init_position: {x: e.clientX / canvas.width, y: 1 - e.clientY / canvas.height} });
    }
});

canvas.addEventListener("mouseup", () => {
    state = setState(state, { isDragging: false, isPanning: false, isZoomingX: false, isZoomingY: false });
    prevState = setPrevState(prevState, { m_x: state.m_x, m_y: state.m_y });
});
canvas.addEventListener("mouseleave", () => {
    state = setState(state, { isDragging: false, isPanning: false, isZoomingX: false, isZoomingY: false });
    prevState = setPrevState(prevState, { m_x: state.m_x, m_y: state.m_y });
});

/////////////////////////////////////////////////////////////////


function initCanvas(ctx: CanvasRenderingContext2D) {
    state = setState(state, { m_x: 1, m_y: 1});
    prevState = setPrevState(prevState, { m_x: 1, m_y: 1});
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = MAIN_BG; // or any color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}



function renderChart(data: FootprintCandle[]) {
    const x_ticks = linspaceDivisible(state.t_min, state.t_max, state.tick_x);
    const y_ticks = linspaceDivisible(state.p_min, state.p_max, state.tick_y);

    console.log(x_ticks.length)

    const rOrigin = transform(0, 0, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
    const rPT = transform(60 * 1000, 20, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
    const gridDimension = {x: Math.abs(rPT.x - rOrigin.x), y: Math.abs(rPT.y - rOrigin.y)};

    const candleWidth = gridDimension.x >= CANDLE_WIDTH ? CANDLE_WIDTH : gridDimension.x
    

    data.forEach((candle, i) => {
        ctx.fillStyle = candle.close >= candle.open ? GREEN : RED;
        ctx.strokeStyle = candle.close >= candle.open ? GREEN : RED;
        const t = (new Date(candle.t)).getTime();
        const r_open = transform(t, candle.open, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
        const r_high = transform(t, candle.high, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
        const r_low = transform(t, candle.low, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
        const r_close = transform(t, candle.close, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
        
        const barTop = Math.min(r_open.y, r_close.y), barHeight = Math.max(Math.abs(r_open.y - r_close.y), 0.5);
        ctx.fillRect(r_open.x - candleWidth / 2, barTop, candleWidth, barHeight);
        drawLine(ctx, r_high.x, barTop, r_high.x, r_high.y)
        drawLine(ctx, r_low.x, barTop + barHeight, r_low.x, r_low.y)


        if ((gridDimension.x >=  1.5 * WIDTH_VOL_LEVEL) && (gridDimension.y >= 1.5 * VOL_BAR_HEIGHT)) {
            const maxVolSeller = Math.max(...candle.footprint.map(f => f.taker_seller));
            const maxVolBuyer = Math.max(...candle.footprint.map(f => f.taker_buyer));
            const maxTotalVol = Math.max(...candle.footprint.map(f => f.taker_buyer + f.taker_seller));
            candle.footprint.forEach(f => {
                const r_level = transform(t, f.price_level, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
                if (r_level.x >= -0.1 * canvas.width && r_level.y >= -0.1 * canvas.height ) {
                    if (state.mode === 'bid/ask') {
                        const alphaSeller = smoothAlphaRange(f.taker_seller / maxVolSeller);
                        const alphaBuyer = smoothAlphaRange(f.taker_buyer / maxVolBuyer);

                        ctx.fillStyle = DARK_RED; //`rgba(160, 40, 40, ${alphaSeller})`; 
                        ctx.fillRect(
                            r_level.x - f.taker_seller / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL - candleWidth / 2, 
                            r_level.y - VOL_BAR_HEIGHT / 2, 
                            f.taker_seller / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL, VOL_BAR_HEIGHT);

                        ctx.fillStyle = DARK_GREEN;//`rgba(15, 120, 80, ${alphaBuyer})`;
                        ctx.fillRect(
                            r_level.x + candleWidth / 2, 
                            r_level.y - VOL_BAR_HEIGHT / 2, 
                            f.taker_buyer / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL, VOL_BAR_HEIGHT);
                        
                        ctx.font = "10px Roboto";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = 'rgb(255, 255, 255)';
                        ctx.textAlign = 'right';
                        ctx.fillText(f.taker_seller.toFixed(2), r_level.x - (candleWidth / 2 + 5), r_level.y);
                        ctx.textAlign = 'left';
                        ctx.fillText(f.taker_buyer.toFixed(2), r_level.x + (candleWidth / 2 + 5), r_level.y);
                    } else {

                        const volume = f.taker_buyer + f.taker_seller;
                        const delta = f.taker_buyer - f.taker_seller;

                        ctx.fillStyle = `rgb(28, 110, 164)`; 
                        ctx.fillRect(
                            r_level.x - volume / maxTotalVol * WIDTH_VOL_LEVEL - candleWidth / 2, 
                            r_level.y - VOL_BAR_HEIGHT / 2, 
                            volume /maxTotalVol * WIDTH_VOL_LEVEL, VOL_BAR_HEIGHT);

                        ctx.font = "10px Roboto";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = 'rgb(255, 255, 255)';
                        ctx.textAlign = 'right';
                        ctx.fillText(volume.toFixed(1), r_level.x - (candleWidth / 2 + 5), r_level.y);
                        ctx.textAlign = 'left';
                        ctx.fillStyle = delta > 0 ? GREEN : RED;
                        ctx.fillText(delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1), r_level.x + (candleWidth / 2 + 5), r_level.y);
                    }
                }
            });

        }
        if ((gridDimension.x >=  1.5 * WIDTH_VOL_LEVEL)) {
            const totalVolume = candle.footprint.reduce((accumulator, level) => accumulator + level.taker_buyer + level.taker_seller, 0)
            const totalDelta = candle.footprint.reduce((accumulator, level) => accumulator + level.taker_buyer - level.taker_seller, 0)

            ctx.fillStyle = BRIGHT_BG;
            ctx.strokeStyle = "white";
            ctx.strokeStyle = "white";
            ctx.fillRect(r_open.x - gridDimension.x / 2, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT), gridDimension.x, VOL_PROFILE_HEIGHT);
            ctx.strokeRect(r_open.x - gridDimension.x / 2, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT), gridDimension.x, VOL_PROFILE_HEIGHT);
            ctx.fillRect(r_open.x - gridDimension.x / 2, canvas.height - (X_AXIS_WIDTH + 2 * VOL_PROFILE_HEIGHT), gridDimension.x, VOL_PROFILE_HEIGHT);
            ctx.strokeRect(r_open.x - gridDimension.x / 2, canvas.height - (X_AXIS_WIDTH + 2 * VOL_PROFILE_HEIGHT), gridDimension.x, VOL_PROFILE_HEIGHT);
            
            ctx.font = "14px Roboto";
            ctx.fillStyle = "white";
            ctx.textBaseline = "middle";
            ctx.textAlign = 'center';
            ctx.fillText(totalVolume.toFixed(1), r_open.x, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT) + VOL_PROFILE_HEIGHT / 2);

            ctx.fillStyle = totalDelta > 0 ? GREEN : RED;
            ctx.fillText(totalDelta > 0 ? `+${totalDelta.toFixed(1)}` : totalDelta.toFixed(1), r_open.x, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT) - VOL_PROFILE_HEIGHT / 2);
        }
    });

    ////////////////////////////////////////////////////////////////////////
    // Price axis
    ctx.fillStyle = MAIN_BG;
    ctx.fillRect(canvas.width - (Y_AXIS_WIDTH), 0, Y_AXIS_WIDTH, canvas.height)
    ctx.strokeStyle = FADED_GRAY;
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "12px Roboto";

    y_ticks.forEach((p, i) => {
        const r = transform(0, p, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
        ctx.fillText(p.toString(), canvas.width - (Y_AXIS_WIDTH - MARGIN), r.y);
        drawLine(ctx, 0, r.y, canvas.width - Y_AXIS_WIDTH, r.y);
    });
    ctx.strokeStyle = "white";

    ////////////////////////////////////////////////////////////////////////
    // The time axis
    ctx.fillStyle = MAIN_BG;
    ctx.fillRect(0, canvas.height - X_AXIS_WIDTH, canvas.width, X_AXIS_WIDTH)
    ctx.strokeStyle = FADED_GRAY;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.strokeStyle = FADED_GRAY;
    
    x_ticks.forEach((t, i) => {
        const r = transform(new Date(t).getTime(), 0, state.t_min, state.t_max, state.p_min, state.p_max, canvas.width, canvas.height, state.m_x, state.m_y);
        drawLine(ctx, r.x, 0, r.x, canvas.height - X_AXIS_WIDTH);
        // const label = new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const label = (t % 86400000 === 0)
            ? new Date(t).toLocaleString([], { month: "2-digit", day: "2-digit"})
            : new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        ctx.fillText(label, r.x, canvas.height - (X_AXIS_WIDTH - MARGIN)); // 15px from bottom
    });

    ////////////////////////////////////////////////////////////////////////
    // Bottom right corner of chart
    ctx.fillStyle = MAIN_BG;
    ctx.fillRect(canvas.width - (Y_AXIS_WIDTH), canvas.height - X_AXIS_WIDTH, Y_AXIS_WIDTH, X_AXIS_WIDTH)
    ctx.strokeStyle = "white";
    drawLine(ctx, 0, canvas.height - X_AXIS_WIDTH, canvas.width, canvas.height - X_AXIS_WIDTH);
    drawLine(ctx, canvas.width - Y_AXIS_WIDTH, 0, canvas.width - Y_AXIS_WIDTH, canvas.height);

    

    ctx.fillStyle = BRIGHT_BG;
    ctx.strokeStyle = "white";
    ctx.fillRect(0, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT), Y_AXIS_WIDTH, VOL_PROFILE_HEIGHT);
    ctx.strokeRect(0, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT), Y_AXIS_WIDTH, VOL_PROFILE_HEIGHT);
    ctx.fillRect(0, canvas.height - (X_AXIS_WIDTH + 2 * VOL_PROFILE_HEIGHT), Y_AXIS_WIDTH, VOL_PROFILE_HEIGHT);
    ctx.strokeRect(0, canvas.height - (X_AXIS_WIDTH + 2 * VOL_PROFILE_HEIGHT), Y_AXIS_WIDTH, VOL_PROFILE_HEIGHT);
    
    ctx.font = "14px Roboto";
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    ctx.textAlign = 'center';
    ctx.fillText("Volume", Y_AXIS_WIDTH / 2, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT) + VOL_PROFILE_HEIGHT / 2);
    ctx.fillText("Delta", Y_AXIS_WIDTH / 2, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT) - VOL_PROFILE_HEIGHT / 2);

}

function onDataFetched(data: FootprintCandle[]) {
    const init_bar_dist   = Math.floor(canvas.width / MAX_INIT_BARS);
    const nCandles = Math.floor(0.75 * canvas.width / (init_bar_dist));
    const tLast = new Date(data.at(-1)?.t ?? 0).getTime();
    const data_visible = data.slice(data.length - nCandles);

    const t_min = tLast - nCandles * 60 * 1000;
    const t_max = tLast + (INIT_TICK_X - nCandles) * 60 * 1000;

    const p_min = Math.min(...data_visible.map(c => c.low));
    const p_max = Math.max(...data_visible.map(c => c.high));

    const intervalsize = getClosestTimeInterval((t_max - t_min) / INIT_TICK_X)
    const tickSize = getClosestTickSize((p_max - p_min) / INIT_TICK_Y);

    state = setState(state, { 
        t_min: t_min,
        t_max: t_max,

        p_min: round(p_min - 0.2 * (p_max - p_min), -1),
        p_max: round(p_max + 0.2 * (p_max - p_min), -1),
        
        tick_x: intervalsize,
        tick_y: tickSize,

        data: data
    });
    renderChart(data);
}


document.getElementById("reset")!.addEventListener("click", () => {
    initCanvas(ctx);
    onDataFetched(state.data);
});

function updateModeButton() {
  const btn = document.getElementById("mode") as HTMLButtonElement;
  btn.textContent = state.mode === 'vol/delta' 
    ? "Mode: Vol/Delta" 
    : "Mode: Bid/Ask";
}

updateModeButton();

const btn = document.getElementById("mode") as HTMLButtonElement;
btn.addEventListener("click", () => {
    state = setState(state, {mode: state.mode === 'vol/delta' ? 'bid/ask' : 'vol/delta'})
    updateModeButton();
    initCanvas(ctx);
    renderChart(state.data);
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    if (x >= 0 && x < canvas.width - Y_AXIS_WIDTH && y > 0 && y < canvas.height - X_AXIS_WIDTH) {
        overlayCtx.clearRect(0, 0, canvas.width, canvas.height);
        overlayCtx.fillStyle = "white";
        overlayCtx.fillRect(x, y, 10, 10);
    } else {
        overlayCtx.clearRect(0, 0, canvas.width, canvas.height);
    }

});