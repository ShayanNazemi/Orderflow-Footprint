DROP TABLE IF EXISTS footprints CASCADE;
DROP TABLE IF EXISTS candles CASCADE;
DROP TABLE IF EXISTS agg_trades CASCADE;

CREATE TABLE agg_trades (
    event_time     TIMESTAMPTZ NOT NULL,
    trade_time     TIMESTAMPTZ NOT NULL,
    symbol         TEXT NOT NULL,
    agg_id         BIGINT NOT NULL,
    price          NUMERIC(18,8) NOT NULL,
    quantity       NUMERIC(18,8) NOT NULL,
    first_trade_id BIGINT NOT NULL,
    last_trade_id  BIGINT NOT NULL,
    is_buyer_maker BOOLEAN NOT NULL
);
CREATE INDEX agg_trades_trade_time_idx ON agg_trades(trade_time DESC);
CREATE UNIQUE INDEX idx_agg_id_time ON agg_trades(agg_id, trade_time);
CREATE INDEX idx_symbol_time ON agg_trades(symbol, trade_time);
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('agg_trades', 'trade_time', chunk_time_interval => interval '1 day');

CREATE TABLE candles (
    bucket_time TIMESTAMPTZ NOT NULL,
    symbol      TEXT NOT NULL,
    open        DOUBLE PRECISION,
    high        DOUBLE PRECISION,
    low         DOUBLE PRECISION,
    close       DOUBLE PRECISION,
    volume      DOUBLE PRECISION,
    PRIMARY KEY (bucket_time, symbol)
);

CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('candles', 'bucket_time', chunk_time_interval => interval '1 day');
CREATE TABLE footprints (
    bucket_time  TIMESTAMPTZ NOT NULL,
    symbol       TEXT NOT NULL,
    price_level  NUMERIC NOT NULL,
    taker_buyer  NUMERIC NOT NULL,
    taker_seller NUMERIC NOT NULL,
    PRIMARY KEY (bucket_time, symbol, price_level)
);
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('footprints', 'bucket_time', chunk_time_interval => interval '1 day');