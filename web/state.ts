import {CanvasState} from './types';


export const INIT_STATE: CanvasState = {
    isDragging: false,
    isPanning: false,
    isZoomingX: false,
    isZoomingY: false,
    initPosition: {
        x: 0,
        y: 0
    },

    tMin: 0,
    tMax: 0,
    tRef: 0,

    pMin: 0,
    pMax: 0,
    pRef: 0,

    mX: 1,
    mY: 1,
    tickX: 0,
    tickY: 0,
    decimalX: 0,
    decimalY: 0,

    data      : [],
    mode : 'vol/delta',
}


export function setState(state: CanvasState, partial: Partial<CanvasState>) {
    return { ...state, ...partial };
}

export function setPrevState(prevState: CanvasState, partial: Partial<CanvasState>) {
    return { ...prevState, ...partial };
}