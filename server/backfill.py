import asyncpg
import asyncio
import datetime
import pytz

async def backfill(start_time, end_time, step_days=1):
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost"
    )

    # Read SQL once
    candles_sql = open("./server/db/backfill/candles.sql").read()
    footprints_sql = open("./server/db/backfill/footprints.sql").read()

    t = start_time
    while t < end_time:
        t_next = t + datetime.timedelta(days=step_days)
        print(f"Backfilling {t} → {t_next}")

        await conn.execute(candles_sql, t, t_next)
        await conn.execute(footprints_sql, t, t_next)

        t = t_next

    await conn.close()


if __name__ == "__main__":
    tz = pytz.UTC
    start = datetime.datetime(2025, 8, 15, 0, 0, 0, tzinfo=tz)
    end   = datetime.datetime(2025, 8, 31, 0, 0, 0, tzinfo=tz)
    asyncio.run(backfill(start, end))
