-- 1️⃣ Raw trades table
CREATE TABLE agg_trades (
    event_time TIMESTAMPTZ NOT NULL,
    trade_time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    agg_id BIGINT NOT NULL,
    price NUMERIC,
    quantity NUMERIC,
    first_trade_id BIGINT,
    last_trade_id BIGINT,
    is_buyer_maker BOOLEAN,
    PRIMARY KEY (trade_time, agg_id)
);


-- Optional index for fast queries by time
CREATE INDEX idx_agg_trades_trade_time ON agg_trades(trade_time);

------------------------------------------------------------

-- 2️⃣ Candles table
CREATE TABLE candles (
    bucket_time TIMESTAMPTZ NOT NULL,
    symbol      TEXT NOT NULL,
    open        NUMERIC(18,8) NOT NULL,
    high        NUMERIC(18,8) NOT NULL,
    low         NUMERIC(18,8) NOT NULL,
    close       NUMERIC(18,8) NOT NULL,
    volume      NUMERIC(24,8) NOT NULL,
    PRIMARY KEY (bucket_time, symbol)
);

-- Optional index for time queries
CREATE INDEX idx_candles_bucket_time ON candles(bucket_time);

------------------------------------------------------------

-- 3️⃣ Footprints table
CREATE TABLE footprints (
    bucket_time   TIMESTAMPTZ NOT NULL,
    symbol        TEXT NOT NULL,
    price_level   NUMERIC(18,8) NOT NULL,
    taker_buyer   NUMERIC(24,8) NOT NULL,
    taker_seller  NUMERIC(24,8) NOT NULL,
    PRIMARY KEY (bucket_time, symbol, price_level)
);

-- Optional index
CREATE INDEX idx_footprints_bucket_time ON footprints(bucket_time);


-- Make candles a hypertable
SELECT create_hypertable('candles', 'bucket_time');

-- Make footprints a hypertable
SELECT create_hypertable('footprints', 'bucket_time');

-- agg_trades can also be a hypertable if needed
SELECT create_hypertable('agg_trades', 'trade_time');