import {CanvasState} from './types';


export const INIT_STATE: CanvasState = {
    isDragging: false,
    isPanning: false,
    isZoomingX: false,
    isZoomingY: false,
    init_position: {
        x: 0,
        y: 0
    },

    t_min: 0,
    t_max: 0,
    t_ref: 0,

    p_min: 0,
    p_max: 0,
    p_ref: 0,

    m_x: 1,
    m_y: 1,
    tick_x: 0,
    tick_y: 0,
    decimal_x: 0,
    decimal_y: 0,

    data      : [],
    mode : 'vol/delta',
}


export function setState(state: CanvasState, partial: Partial<CanvasState>) {
    return { ...state, ...partial };
}

export function setPrevState(prevState: CanvasState, partial: Partial<CanvasState>) {
    return { ...prevState, ...partial };
}