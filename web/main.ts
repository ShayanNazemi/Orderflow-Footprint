import { CanvasState, FootprintCandle, PriceLevel } from "./types";
import { setState, setPrevState, INIT_STATE } from "./state";
import { drawLine, drawDashedLine, linspaceDivisible, round, smoothAlphaRange, transform, getClosestTickSize, getClosestTimeInterval, inverseTransform } from "./utils";

import { BRIGHT_BG, MAIN_BG, GREEN, DARK_RED, RED, FADED_GRAY, MARGIN, X_AXIS_WIDTH, Y_AXIS_WIDTH, MAX_INIT_BARS, CANDLE_WIDTH, WIDTH_VOL_LEVEL, DARK_GREEN, LIGHT_GRAY } from "./constants";


const canvas = document.getElementById('chart') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const overlayCanvas = document.getElementById('overlay') as HTMLCanvasElement;
const overlayCtx = overlayCanvas.getContext('2d')!;
overlayCanvas.width = window.innerWidth;
overlayCanvas.height = window.innerHeight;

const VOL_BAR_HEIGHT = 10;

const INIT_tickX = 20;
const INIT_tickY = 20;

const VOL_PROFILE_HEIGHT = 30;

const POINTER_HEIGHT = 30;
const POINTER_WIDTH = 100;

const HEADER_HEIGHT = 60;



let state: CanvasState = { ...INIT_STATE };
let prevState: CanvasState = { ...state };

initCanvas(ctx);

fetch('http://127.0.0.1:5000/api/footprint?start=2025-08-20_15:40:00&end=2025-08-30_16:55:00&bin_width=10')
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
        prevState = setPrevState(prevState, { tMin: state.tMin, tMax: state.tMax, tRef: (state.tMin + state.tMax) / 2})
    } else if (isOnYAxis(e)) {
        state = setState(state, { isZoomingY : true })
        prevState = setPrevState(prevState, { pMin: state.pMin, pMax: state.pMax, pRef: (state.pMin + state.pMax) / 2})
    } else {
        state = setState(state, { isPanning : true })
    }
    state = setState(state, { isDragging : true, initPosition: {x: e.clientX / canvas.width, y: 1 - e.clientY / canvas.height} })
});

canvas.addEventListener("mousemove", e => {
    if (!state.isDragging) return;

    if (isOnXAxis(e) || state.isZoomingX) {
        const deltaX = (e.clientX / canvas.width - state.initPosition.x) / prevState.mX;
        const mX = Math.pow(3, deltaX);
        state = setState(state, { 
            mX: mX,
            tMin: prevState.tRef + (prevState.tMin - prevState.tRef) / mX,
            tMax: prevState.tRef + (prevState.tMax - prevState.tRef) / mX
        });

        const intervalSize = getClosestTimeInterval((state.tMax - state.tMin) / INIT_tickX);
        state = setState(state, { tickX: intervalSize });

        initCanvas(ctx);
        renderChart(state.data);
    } else if (isOnYAxis(e) || state.isZoomingY) {
        const deltaY = (1 - e.clientY / canvas.height - state.initPosition.y) / prevState.mY;
        const mY = Math.pow(3, deltaY);
        state = setState(state, { 
            mY: mY,
            pMin: prevState.pRef + (prevState.pMin - prevState.pRef) / mY,
            pMax: prevState.pRef + (prevState.pMax - prevState.pRef) / mY
        });
        
        const tickSize = getClosestTickSize((state.pMax - state.pMin) / INIT_tickY);
        state = setState(state, { tickY: tickSize });

        initCanvas(ctx);
        renderChart(state.data);
    } else {
        const deltaX = (e.clientX / canvas.width - state.initPosition.x) / state.mX;
        const deltaY = (1 - e.clientY / canvas.height - state.initPosition.y) / state.mY;

        state = setState(state, {
            tMin: state.tMin - deltaX * (state.tMax - state.tMin),
            tMax: state.tMax - deltaX * (state.tMax - state.tMin),
            pMin: state.pMin - deltaY * (state.pMax - state.pMin),
            pMax: state.pMax - deltaY * (state.pMax - state.pMin)
        })

        initCanvas(ctx);
        renderChart(state.data); // REDraw

        state = setState(state, { initPosition: {x: e.clientX / canvas.width, y: 1 - e.clientY / canvas.height} });
    }
});

canvas.addEventListener("wheel", (e: WheelEvent) => {
    e.preventDefault(); // prevent page scrolling
    state = setState(state, { isZoomingX : true })
    prevState = setPrevState(prevState, { tMin: state.tMin, tMax: state.tMax, tRef: (state.tMin + state.tMax) / 2})
    const mX = e.deltaY < 0 ? Math.pow(3, 0.1) : Math.pow(3, -0.1);
    state = setState(state, { 
        mX: mX,
        tMin: prevState.tRef + (prevState.tMin - prevState.tRef) / mX,
        tMax: prevState.tRef + (prevState.tMax - prevState.tRef) / mX
    });

    console.log(mX, state.tMax - state.tMin, (prevState.tMin - prevState.tRef));

    const intervalSize = getClosestTimeInterval((state.tMax - state.tMin) / INIT_tickX);
    state = setState(state, { tickX: intervalSize, isZoomingX: false });

    initCanvas(ctx);
    renderChart(state.data);
});

canvas.addEventListener("mouseup", () => {
    state = setState(state, { isDragging: false, isPanning: false, isZoomingX: false, isZoomingY: false });
    prevState = setPrevState(prevState, { mX: state.mX, mY: state.mY });
});
canvas.addEventListener("mouseleave", () => {
    state = setState(state, { isDragging: false, isPanning: false, isZoomingX: false, isZoomingY: false });
    prevState = setPrevState(prevState, { mX: state.mX, mY: state.mY });
});

/////////////////////////////////////////////////////////////////


function initCanvas(ctx: CanvasRenderingContext2D) {
    state = setState(state, { mX: 1, mY: 1});
    prevState = setPrevState(prevState, { mX: 1, mY: 1});
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = MAIN_BG; // or any color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}



function renderChart(data: FootprintCandle[]) {
    const xTicks = linspaceDivisible(state.tMin, state.tMax, state.tickX);
    const yTicks = linspaceDivisible(state.pMin, state.pMax, state.tickY);

    console.log(xTicks.length)

    const rOrigin = transform(0, 0, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
    const rPT = transform(60 * 1000, 20, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
    const gridDimension = {x: Math.abs(rPT.x - rOrigin.x), y: Math.abs(rPT.y - rOrigin.y)};

    const candleWidth = gridDimension.x >= CANDLE_WIDTH ? CANDLE_WIDTH : gridDimension.x
    

    data.forEach((candle, i) => {
        ctx.fillStyle = candle.close >= candle.open ? GREEN : RED;
        ctx.strokeStyle = candle.close >= candle.open ? GREEN : RED;
        const t = (new Date(candle.t)).getTime();
        const rOpen = transform(t, candle.open, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
        const rHigh = transform(t, candle.high, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
        const rLow = transform(t, candle.low, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
        const rClose = transform(t, candle.close, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
        
        const barTop = Math.min(rOpen.y, rClose.y), barHeight = Math.max(Math.abs(rOpen.y - rClose.y), 0.5);
        ctx.fillRect(rOpen.x - candleWidth / 2, barTop, candleWidth, barHeight);
        drawLine(ctx, rHigh.x, barTop, rHigh.x, rHigh.y)
        drawLine(ctx, rLow.x, barTop + barHeight, rLow.x, rLow.y)


        if ((gridDimension.x >=  1.5 * WIDTH_VOL_LEVEL) && (gridDimension.y >= 1.5 * VOL_BAR_HEIGHT)) {
            const maxVolSeller = Math.max(...candle.footprint.map(f => f["taker_seller"]));
            const maxVolBuyer = Math.max(...candle.footprint.map(f => f["taker_buyer"]));
            const maxTotalVol = Math.max(...candle.footprint.map(f => f["taker_buyer"] + f["taker_seller"]));
            candle.footprint.forEach(f => {
                const r_level = transform(t, f.price_level, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
                if (r_level.x >= -0.1 * canvas.width && r_level.y >= -0.1 * canvas.height ) {
                    if (state.mode === 'bid/ask') {
                        const alphaSeller = smoothAlphaRange(f["taker_seller"] / maxVolSeller);
                        const alphaBuyer = smoothAlphaRange(f["taker_buyer"] / maxVolBuyer);

                        ctx.fillStyle = DARK_RED; //`rgba(160, 40, 40, ${alphaSeller})`; 
                        ctx.fillRect(
                            r_level.x - f["taker_seller"] / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL - candleWidth / 2, 
                            r_level.y - VOL_BAR_HEIGHT / 2, 
                            f["taker_seller"] / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL, VOL_BAR_HEIGHT);

                        ctx.fillStyle = DARK_GREEN;//`rgba(15, 120, 80, ${alphaBuyer})`;
                        ctx.fillRect(
                            r_level.x + candleWidth / 2, 
                            r_level.y - VOL_BAR_HEIGHT / 2, 
                            f["taker_buyer"] / (maxVolSeller + maxVolBuyer) * WIDTH_VOL_LEVEL, VOL_BAR_HEIGHT);
                        
                        ctx.font = "10px Roboto";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = 'rgb(255, 255, 255)';
                        ctx.textAlign = 'right';
                        ctx.fillText(f["taker_seller"].toFixed(2), r_level.x - (candleWidth / 2 + 5), r_level.y);
                        ctx.textAlign = 'left';
                        ctx.fillText(f["taker_buyer"].toFixed(2), r_level.x + (candleWidth / 2 + 5), r_level.y);
                    } else {

                        const volume = f["taker_buyer"] + f["taker_seller"];
                        const delta = f["taker_buyer"] - f["taker_seller"];

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
            const totalVolume = candle.footprint.reduce((accumulator, level) => accumulator + level["taker_buyer"] + level["taker_seller"], 0)
            const totalDelta = candle.footprint.reduce((accumulator, level) => accumulator + level["taker_buyer"] - level["taker_seller"], 0)

            ctx.fillStyle = BRIGHT_BG;
            ctx.strokeStyle = "white";
            ctx.strokeStyle = "white";
            ctx.fillRect(rOpen.x - gridDimension.x / 2, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT), gridDimension.x, VOL_PROFILE_HEIGHT);
            ctx.strokeRect(rOpen.x - gridDimension.x / 2, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT), gridDimension.x, VOL_PROFILE_HEIGHT);
            ctx.fillRect(rOpen.x - gridDimension.x / 2, canvas.height - (X_AXIS_WIDTH + 2 * VOL_PROFILE_HEIGHT), gridDimension.x, VOL_PROFILE_HEIGHT);
            ctx.strokeRect(rOpen.x - gridDimension.x / 2, canvas.height - (X_AXIS_WIDTH + 2 * VOL_PROFILE_HEIGHT), gridDimension.x, VOL_PROFILE_HEIGHT);
            
            ctx.font = "14px Roboto";
            ctx.fillStyle = "white";
            ctx.textBaseline = "middle";
            ctx.textAlign = 'center';
            ctx.fillText(totalVolume.toFixed(1), rOpen.x, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT) + VOL_PROFILE_HEIGHT / 2);

            ctx.fillStyle = totalDelta > 0 ? GREEN : RED;
            ctx.fillText(totalDelta > 0 ? `+${totalDelta.toFixed(1)}` : totalDelta.toFixed(1), rOpen.x, canvas.height - (X_AXIS_WIDTH + VOL_PROFILE_HEIGHT) - VOL_PROFILE_HEIGHT / 2);
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

    yTicks.forEach((p, i) => {
        const r = transform(0, p, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
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
    
    xTicks.forEach((t, i) => {
        const r = transform(new Date(t).getTime(), 0, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
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
    const initBarDist   = Math.floor(canvas.width / MAX_INIT_BARS);
    const nCandles = Math.floor(0.75 * canvas.width / (initBarDist));
    const tLast = new Date(data.at(-1)?.t ?? 0).getTime();
    const dataVisible = data.slice(data.length - nCandles);

    const tMin = tLast - nCandles * 60 * 1000;
    const tMax = tLast + (INIT_tickX - nCandles) * 60 * 1000;

    const pMin = Math.min(...dataVisible.map(c => c.low));
    const pMax = Math.max(...dataVisible.map(c => c.high));

    const intervalsize = getClosestTimeInterval((tMax - tMin) / INIT_tickX)
    const tickSize = getClosestTickSize((pMax - pMin) / INIT_tickY);

    state = setState(state, { 
        tMin: tMin,
        tMax: tMax,

        pMin: round(pMin - 0.2 * (pMax - pMin), -1),
        pMax: round(pMax + 0.2 * (pMax - pMin), -1),
        
        tickX: intervalsize,
        tickY: tickSize,

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
        const z = inverseTransform(x, y, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY);
        const roundedT = Math.round(z.t / (60 * 1000)) * 60 * 1000;
        const roundedR = transform(roundedT, z.p, state.tMin, state.tMax, state.pMin, state.pMax, canvas.width, canvas.height, state.mX, state.mY)

        overlayCtx.clearRect(0, 0, canvas.width, canvas.height);
        overlayCtx.strokeStyle = LIGHT_GRAY;
        drawDashedLine(overlayCtx, roundedR.x, 0, roundedR.x, canvas.height - X_AXIS_WIDTH);
        drawDashedLine(overlayCtx, 0, y, canvas.width - Y_AXIS_WIDTH, y);

        overlayCtx.fillStyle = BRIGHT_BG;
        overlayCtx.fillRect(roundedR.x - POINTER_WIDTH / 2, canvas.height - X_AXIS_WIDTH, POINTER_WIDTH, POINTER_HEIGHT);
        overlayCtx.fillRect(canvas.width - Y_AXIS_WIDTH , y - POINTER_HEIGHT / 2, Y_AXIS_WIDTH, POINTER_HEIGHT);

        const t = new Date(roundedT).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        overlayCtx.font = "12px Roboto";
        overlayCtx.fillStyle = "white";

        overlayCtx.textBaseline = "top";
        overlayCtx.textAlign = "center";
        overlayCtx.fillText(t, roundedR.x, canvas.height - X_AXIS_WIDTH + MARGIN);

        overlayCtx.textBaseline = "middle";
        overlayCtx.textAlign = "left";
        overlayCtx.fillText(z.p.toFixed(1), canvas.width - Y_AXIS_WIDTH + MARGIN, y);



        const hoveredCandle = state.data.filter(x => (new Date(x.t)).getTime() == roundedT).at(0);
        const diff = hoveredCandle && hoveredCandle.close - hoveredCandle.open;
        const ohlcLabel = hoveredCandle ? `O : ${hoveredCandle.open}   H : ${hoveredCandle.high}   L : ${hoveredCandle.low}   C : ${hoveredCandle.close}   ${hoveredCandle.close > hoveredCandle.open ? `+${diff!.toFixed(1)}` : diff!.toFixed(1)} (${hoveredCandle.close > hoveredCandle.open ? `+${(diff! / hoveredCandle.open * 100).toFixed(2)}` : (diff! / hoveredCandle.open * 100).toFixed(2)}%)` : "O : NA   H : NA   L : NA   C : NA"
        overlayCtx.font = "bold 12px Roboto";
        overlayCtx.textBaseline = "top";
        overlayCtx.fillStyle = hoveredCandle ? (hoveredCandle.close > hoveredCandle.open ? GREEN : RED) : "white"
        overlayCtx.fillText(ohlcLabel, 2 * MARGIN, HEADER_HEIGHT + MARGIN)

    } else {
        overlayCtx.clearRect(0, 0, canvas.width, canvas.height);
    }

});