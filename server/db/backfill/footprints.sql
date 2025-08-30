INSERT INTO footprints (bucket_time, symbol, price_level, taker_buyer, taker_seller)
SELECT
    date_trunc('minute', trade_time) AS bucket_time,
    symbol,
    ROUND(price::numeric, 1) AS price_level,   -- or your binning logic
    SUM(CASE WHEN is_buyer_maker = false THEN quantity ELSE 0 END) AS taker_buyer,
    SUM(CASE WHEN is_buyer_maker = true  THEN quantity ELSE 0 END) AS taker_seller
FROM agg_trades
WHERE trade_time >= $1 AND trade_time < $2
GROUP BY bucket_time, symbol, price_level
ORDER BY bucket_time, price_level DESC;
