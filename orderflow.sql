WITH params AS (
    SELECT 
        $1::TIMESTAMPTZ AS start_time,
        $2::TIMESTAMPTZ AS end_time,
        $3::FLOAT8 AS bin_width
),
trades AS (
    SELECT *
    FROM agg_trades, params
    WHERE trade_time >= params.start_time AND trade_time < params.end_time
),
-- Aggregate OHLCV per minute
kline AS (
    SELECT
        time_bucket('1 minute', trade_time) AS minute,
        FIRST(price, trade_time) AS open,
        MAX(price) AS high,
        MIN(price) AS low,
        LAST(price, trade_time) AS close,
        SUM(quantity) AS volume
    FROM trades
    GROUP BY minute
),
-- Aggregate footprint (price bins per minute)
footprint AS (
    SELECT 
        time_bucket('1 minute', trade_time) AS minute,
        ROUND(price / params.bin_width) * params.bin_width AS price_bin,
        SUM(quantity) FILTER (WHERE is_buyer_maker = TRUE) AS taker_seller,
        SUM(quantity) FILTER (WHERE is_buyer_maker = FALSE) AS taker_buyer
    FROM trades, params
    GROUP BY minute, price_bin
)
SELECT 
    kline.minute AS t,
    kline.open, kline.high, kline.low, kline.close, kline.volume,
    json_agg(
        json_build_object(
            'price_level', footprint.price_bin,
            'taker_seller', COALESCE(footprint.taker_seller,0),
            'taker_buyer', COALESCE(footprint.taker_buyer,0)
        )
        ORDER BY footprint.price_bin DESC
    ) AS footprint
FROM kline
JOIN footprint ON footprint.minute = kline.minute
GROUP BY kline.minute, kline.open, kline.high, kline.low, kline.close, kline.volume
ORDER BY kline.minute;
