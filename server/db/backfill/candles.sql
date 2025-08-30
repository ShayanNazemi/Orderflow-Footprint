INSERT INTO candles (bucket_time, symbol, open, high, low, close, volume)
SELECT 
    bucket_time,
    symbol,
    (array_agg(price ORDER BY trade_time ASC))[1] AS open,
    MAX(price) AS high,
    MIN(price) AS low,
    (array_agg(price ORDER BY trade_time DESC))[1] AS close,
    SUM(quantity) AS volume
FROM (
    SELECT 
        date_trunc('minute', trade_time) AS bucket_time,
        symbol,
        price,
        quantity,
        trade_time
    FROM agg_trades
    WHERE trade_time >= $1 AND trade_time < $2
) t
GROUP BY bucket_time, symbol
ORDER BY bucket_time, symbol;
