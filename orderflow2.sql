SELECT
  time_bucket('1 min', time) AS bucket,
  symbol,
  /* ohlc */ first(price, time) AS o,
  max(price) AS h, min(price) AS l, last(price, time) AS c,
  /* arrays aligned by bin */
  ARRAY_AGG(bin_price ORDER BY bin_price)   AS prices,
  ARRAY_AGG(bid_vol   ORDER BY bin_price)   AS bid_vols,
  ARRAY_AGG(ask_vol   ORDER BY bin_price)   AS ask_vols
FROM (
  SELECT
    time, symbol,
    ROUND(price / :tick_size) * :tick_size AS bin_price,
    SUM(CASE WHEN is_buyer_maker THEN qty ELSE 0 END) AS bid_vol,
    SUM(CASE WHEN NOT is_buyer_maker THEN qty ELSE 0 END) AS ask_vol,
    price
  FROM trades
  WHERE symbol = :symbol
  GROUP BY time, symbol, bin_price, price
) t
GROUP BY bucket, symbol;
