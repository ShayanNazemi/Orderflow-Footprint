import asyncio, json, websockets, asyncpg
from datetime import datetime
from collections import defaultdict

URI = "wss://fstream.binance.com/ws/btcusdt@aggTrade"
BATCH_SIZE = 1000
BIN_WIDTH = 0.1

async def main():
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost",
        port=5432
    )
    print("Connected to DB")

    raw_batch = []
    minute_buckets = defaultdict(list)

    while True:
        try:
            async with websockets.connect(URI, ping_interval=20, ping_timeout=20) as ws:
                while True:
                    try:
                        data = json.loads(await ws.recv())
                        trade_time = datetime.fromtimestamp(data["T"] / 1000)
                        price = float(data["p"])
                        qty = float(data["q"])
                        is_buyer_maker = data["m"]
                        bucket_time = trade_time.replace(second=0, microsecond=0)

                        # --- raw trades ---
                        raw_batch.append((
                            datetime.fromtimestamp(data["E"] / 1000),
                            trade_time,
                            data["s"],
                            int(data["a"]),
                            price,
                            qty,
                            int(data["f"]),
                            int(data["l"]),
                            is_buyer_maker
                        ))
                        if len(raw_batch) >= BATCH_SIZE:
                            await conn.executemany(
                                    """
                                    INSERT INTO agg_trades
                                    (event_time, trade_time, symbol, agg_id, price, quantity, first_trade_id, last_trade_id, is_buyer_maker)
                                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                                    """,
                                    raw_batch
                                )
                            raw_batch.clear()
                            print("New batch stored and cleared!")

                        # --- add trade to minute bucket ---
                        minute_buckets[bucket_time].append((price, qty, is_buyer_maker))

                        # --- flush previous minute buckets ---
                        for t in list(minute_buckets.keys()):
                            if t < bucket_time:  # bucket is complete
                                trades = minute_buckets.pop(t)

                                # --- build OHLCV ---
                                open_price = trades[0][0]
                                high_price = max(p for p, _, _ in trades)
                                low_price = min(p for p, _, _ in trades)
                                close_price = trades[-1][0]
                                volume = sum(q for _, q, _ in trades)

                                # insert candle
                                await conn.execute(
                                    """
                                    INSERT INTO candles
                                    (bucket_time, symbol, open, high, low, close, volume)
                                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                                    ON CONFLICT (bucket_time, symbol)
                                    DO UPDATE SET
                                        open = EXCLUDED.open,
                                        high = EXCLUDED.high,
                                        low = EXCLUDED.low,
                                        close = EXCLUDED.close,
                                        volume = EXCLUDED.volume
                                    """,
                                    t, "BTCUSDT", open_price, high_price, low_price, close_price, volume
                                )

                                # --- build normalized footprint ---
                                bins = {}
                                for p, q, maker in trades:
                                    price_bin = round(p / BIN_WIDTH) * BIN_WIDTH
                                    if price_bin not in bins:
                                        bins[price_bin] = {"taker_seller": 0.0, "taker_buyer": 0.0}
                                    if maker:
                                        bins[price_bin]["taker_seller"] += q
                                    else:
                                        bins[price_bin]["taker_buyer"] += q

                                # insert each price level into footprints
                                footprint_rows = [
                                    (t, "BTCUSDT", pb, bins[pb]["taker_buyer"], bins[pb]["taker_seller"])
                                    for pb in bins
                                ]
                                # batch insert
                                await conn.executemany(
                                    """
                                    INSERT INTO footprints
                                    (bucket_time, symbol, price_level, taker_buyer, taker_seller)
                                    VALUES ($1,$2,$3,$4,$5)
                                    ON CONFLICT (bucket_time, symbol, price_level)
                                    DO UPDATE SET
                                        taker_buyer = EXCLUDED.taker_buyer,
                                        taker_seller = EXCLUDED.taker_seller
                                    """,
                                    footprint_rows
                                )
                                print(f"Stored candle + footprint at {t}")
                    except asyncio.TimeoutError as e:
                        print("Timeout error, retrying in 5 seconds...")
                        print(e)
                        await asyncio.sleep(5)

                    except websockets.ConnectionClosed as e:
                        print("Connection closed, reconnecting in 5 seconds...")
                        print(f"Code: {e.code}, Reason: {e.reason}")
                        await asyncio.sleep(5)
                        break

        except Exception as e:
            print("Error happened in re-establishing new websocket connection! Sleeping for 1 minute ...")
            print(e)
            await asyncio.sleep(60)


asyncio.run(main())
