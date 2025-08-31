SELECT 
    EXTRACT(EPOCH FROM trade_time) * 1000 AS trade_time, -- unix ms
    price
FROM agg_trades
WHERE trade_time >= to_timestamp($1 / 1000.0)
  AND trade_time <  to_timestamp($1 / 1000.0) + interval '1 minute'
ORDER BY trade_time ASC;