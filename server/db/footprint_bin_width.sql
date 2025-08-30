WITH footprint_bins AS (
    SELECT 
        f.bucket_time,
        f.symbol,
        ROUND(f.price_level / $4) * $4 AS price_bin,  -- binning
        SUM(f.taker_buyer) AS taker_buyer,
        SUM(f.taker_seller) AS taker_seller
    FROM footprints f
    WHERE f.bucket_time BETWEEN $1 AND $2
      AND f.symbol = $3
    GROUP BY f.bucket_time, f.symbol, price_bin
)
SELECT 
    c.bucket_time,
    c.symbol,
    c.open,
    c.high,
    c.low,
    c.close,
    c.volume,
    COALESCE(
        json_agg(
            json_build_object(
                'price_level', b.price_bin,
                'taker_buyer', b.taker_buyer,
                'taker_seller', b.taker_seller
            )
            ORDER BY b.price_bin DESC
        ) FILTER (WHERE b.price_bin IS NOT NULL), '[]'
    ) AS footprint
FROM candles c
LEFT JOIN footprint_bins b
    ON c.bucket_time = b.bucket_time
   AND c.symbol = b.symbol
WHERE c.bucket_time BETWEEN $1 AND $2
  AND c.symbol = $3
GROUP BY c.bucket_time, c.symbol, c.open, c.high, c.low, c.close, c.volume
ORDER BY c.bucket_time ASC;
