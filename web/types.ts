export type PriceLevel = {
    price_level  : number;
    taker_seller : number;
    taker_buyer  : number;
};

export type FootprintCandle = {
    t            : string;
    open         : number;
    high         : number;
    low          : number;
    close        : number;
    volume       : number;
    footprint    : PriceLevel[];
};

export type CanvasState = {
    isDragging   : boolean,
    isPanning    : boolean,
    isZoomingX   : boolean,
    isZoomingY   : boolean,
    
    init_position: {
        x        : number,
        y        : number
    },

    t_min        : number,
    t_max        : number,
    t_ref        : number,

    p_min        : number,
    p_max        : number,
    p_ref        : number,

    m_x          : number,
    m_y          : number,
    tick_x       : number,
    tick_y       : number,
    decimal_x    : number,
    decimal_y    : number,

    data         : FootprintCandle[]
};
