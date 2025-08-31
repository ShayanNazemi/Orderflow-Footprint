export type PriceLevel = {
    price_level   : number;
    taker_seller  : number;
    taker_buyer   : number;
};

export type FootprintCandle = {
    t             : string;
    open          : number;
    high          : number;
    low           : number;
    close         : number;
    volume        : number;
    footprint     : PriceLevel[];
};

export type CanvasState = {
    isDragging    : boolean,
    isPanning     : boolean,
    isZoomingX    : boolean,
    isZoomingY    : boolean,
    
    initPosition: {
        x         : number,
        y         : number
    },

    tMin          : number,
    tMax          : number,
    tRef          : number,

    pMin          : number,
    pMax          : number,
    pRef          : number,

    mX            : number,
    mY            : number,
    tickX         : number,
    tickY         : number,
    decimalX      : number,
    decimalY      : number,

    data          : FootprintCandle[],
    dataByTime    : Map<number, FootprintCandle>,

    mode          : 'vol/delta' | 'bid/ask',
    gridDimension : {
        x         : number,
        y         : number
    }
};