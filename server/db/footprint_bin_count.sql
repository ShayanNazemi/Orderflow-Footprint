WITH candle_with_bins AS (
    SELECT 
        c.bucket_time,
        c.symbol,
        c.open,
        c.high,
        c.low,
        c.close,
        c.volume,
        (c.high - c.low) / $4::NUMERIC AS bin_width
    FROM candles c
    WHERE c.bucket_time BETWEEN $1 AND $2
      AND c.symbol = $3
),
binned AS (
    SELECT 
        f.bucket_time,
        f.symbol,
        c.low + FLOOR((f.price_level - c.low) / c.bin_width) * c.bin_width AS price_bin,
        SUM(f.taker_buyer) AS taker_buyer,
        SUM(f.taker_seller) AS taker_seller
    FROM footprints f
    JOIN candle_with_bins c
      ON f.bucket_time = c.bucket_time
     AND f.symbol = c.symbol
    GROUP BY f.bucket_time, f.symbol, c.low, c.bin_width, price_bin
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
FROM candle_with_bins c
LEFT JOIN binned b
  ON c.bucket_time = b.bucket_time
 AND c.symbol = b.symbol
GROUP BY c.bucket_time, c.symbol, c.open, c.high, c.low, c.close, c.volume
ORDER BY c.bucket_time ASC;
