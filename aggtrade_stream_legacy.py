import asyncio, json, websockets, asyncpg
from datetime import datetime

URI = "wss://fstream.binance.com/ws/btcusdt@aggTrade"

BATCH_SIZE = 1000

async def main():
    # Connect to DB
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost",
        port=5432
    )
    print("Connected to DB")

    batch = []

    while True:
        try:
            async with websockets.connect(URI, ping_interval=20, ping_timeout=20) as ws:
                while True:
                    data = json.loads(await ws.recv())
                    batch.append((
                        datetime.fromtimestamp(data["E"] / 1000),  # event_time
                        datetime.fromtimestamp(data["T"] / 1000),  # trade_time
                        data["s"],                                 # symbol
                        int(data["a"]),                            # agg_id
                        float(data["p"]),                          # price
                        float(data["q"]),                          # quantity
                        int(data["f"]),                            # first_trade_id
                        int(data["l"]),                            # last_trade_id
                        data["m"]                                  # is_buyer_maker
                    ))

                    if len(batch) >= BATCH_SIZE:
                        # asyncpg uses $1, $2 placeholders
                        await conn.executemany(
                            """
                            INSERT INTO agg_trades
                            (event_time, trade_time, symbol, agg_id, price, quantity, first_trade_id, last_trade_id, is_buyer_maker)
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                            """,
                            batch
                        )
                        batch.clear()
                        print("New batch stored and cleared!")

        except (websockets.ConnectionClosed, asyncio.TimeoutError):
            print("Disconnected, reconnecting in 5 seconds...")
            await asyncio.sleep(5)

# Run the async loop
asyncio.run(main())
