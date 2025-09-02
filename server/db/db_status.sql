SELECT COUNT(*) FROM agg_trades;SELECT pg_size_pretty(pg_database_size('binance'));SELECT 
    MIN(trade_time) AS start_time,
    MAX(trade_time) AS end_time
FROM agg_trades;WITH bounds AS (
    SELECT MIN(trade_time) AS start_time, MAX(trade_time) AS end_time
    FROM agg_trades
),
minutes AS (
    SELECT generate_series(start_time, end_time, interval '1 minute') AS minute_start
    FROM bounds
),
counts AS (
    SELECT
        m.minute_start,
        COUNT(a.trade_time) AS trade_count
    FROM minutes m
    LEFT JOIN agg_trades a
      ON a.trade_time >= m.minute_start
     AND a.trade_time < m.minute_start + interval '1 minute'
    GROUP BY m.minute_start
)
SELECT
    COUNT(*) FILTER (WHERE trade_count > 0) AS non_zero_periods,
    COUNT(*) FILTER (WHERE trade_count = 0) AS zero_periods
FROM counts;
