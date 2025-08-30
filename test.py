import asyncpg
import asyncio
import pprint

async def main():
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost",
        port=5432
    )

    row = await conn.fetchrow("""
        SELECT *
        FROM footprints
        ORDER BY bucket_time DESC
        LIMIT 1
    """)

    pprint.pp(row)

    await conn.close()

asyncio.run(main())
