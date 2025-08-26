import json
import pandas as pd
import asyncio, asyncpg
from datetime import datetime

from lightweight_charts import Chart


async def fetch_footprints(start, end, bin_width=1.0):
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost",
        port=5432
    )

    query = open("orderflow.sql").read()  # or put the SQL inline
    rows = await conn.fetch(query, start, end, bin_width)
    await conn.close()

    # Transform rows into Python structures
    result = []
    for r in rows:
        result.append({
            "t": r["t"],
            "open": float(r["open"]),
            "high": float(r["high"]),
            "low": float(r["low"]),
            "close": float(r["close"]),
            "volume": float(r["volume"]),
            "footprint": json.loads(r["footprint"]) if isinstance(r["footprint"], str) else r["footprint"]
        })
    return result


if __name__ == "__main__":
    # Usage:
    start = datetime(2025, 8, 23, 17, 0)
    end = datetime(2025, 8, 23, 18, 0)
    result = asyncio.run(fetch_footprints(start, end, bin_width=10))

    klines = pd.DataFrame([dict(time = x['t'], open = x['open'], high = x['high'], low = x['low'], close = x['close'], volume = x['volume']) for x in result])
    # print(klines)
    chart = Chart(toolbox=True)
    chart.set(klines)
    _ = chart.marker(time = klines.iloc[0]['time'], 
                     position = klines.iloc[0]['close'], text = 'abc')
    chart.show(block=True)