import json
import pandas as pd
from flask import Flask, request
import asyncio, asyncpg
from datetime import datetime
from flask_cors import CORS
from decimal import Decimal, ROUND_HALF_UP

app = Flask(__name__)
CORS(app)

async def fetch_aggtrade_t(t):
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost",
        port=5432
    )

    query = open("./server/db/aggtrade_t.sql").read()  # or put the SQL inline
    rows = await conn.fetch(query, t)
    await conn.close()

    result = []

    for r in rows:
        result.append({
            "t" : float(r['trade_time'].quantize(Decimal("1"), rounding=ROUND_HALF_UP)),
            "price" : float(r['price'].quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))
        })

    return result


async def fetch_footprints(start, end, bin_width=1.0):
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost",
        port=5432
    )

    query = open("./server/db/aggtrade_to_footprint.sql").read()  # or put the SQL inline
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

async def fetch_last_candle(start, end, symbol, bin_width = None, bin_count = None):
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost",
        port=5432
    )

    if bin_width is not None:
        query = open("./server/db/footprint_bin_width.sql").read()
        rows = await conn.fetch(query, start, end, symbol, bin_width)
    else:
        query = open("./server/db/footprint_bin_count.sql").read()
        rows = await conn.fetch(query, start, end, symbol, bin_count - 1)
    await conn.close()

    result = []
    for row in rows:
        footprint = [
            {
                "price_level": float(Decimal(record["price_level"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
                "taker_buyer": float(Decimal(record["taker_buyer"]).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
                "taker_seller": float(Decimal(record["taker_seller"]).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP))
            } 
            for record in json.loads(row['footprint'])]

        result.append({
            "t": row['bucket_time'],
            "symbol": symbol,
            "open": float(Decimal(row["open"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
            "high": float(Decimal(row["high"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
            "low": float(Decimal(row["low"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
            "close": float(Decimal(row["close"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
            "volume": float(Decimal(row["volume"]).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
            "footprint": footprint
        })
    return result

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route("/api/orderflow", methods = ['GET'])
def get_orderflow():
    if request.method == 'GET':
        start = request.args.get("start")
        end = request.args.get("end")
        bin = float(request.args.get("bin"))
        if start is None or end is None:
            return []
        if bin is None:
            bin = 1

        format_string = "%Y-%m-%d_%H:%M:%S"
        start_obj = datetime.strptime(start, format_string)
        end_obj = datetime.strptime(end, format_string)
        result = asyncio.run(fetch_footprints(start_obj, end_obj, bin_width=bin))

        return result

@app.route("/api/footprint", methods = ['GET'])
def get_last_candle():
    if request.method == 'GET':
        start = request.args.get("start")
        end = request.args.get("end")
        bin_width = request.args.get("bin_width")
        bin_count = request.args.get("bin_count")

        format_string = "%Y-%m-%d_%H:%M:%S"
        start_obj = datetime.strptime(start, format_string)
        end_obj = datetime.strptime(end, format_string)

        if (start is None or end is None) or (bin_width is None and bin_count is None):
            return []
        
        if bin_width is not None:
            return asyncio.run(fetch_last_candle(start_obj, end_obj, symbol="BTCUSDT", bin_width=float(bin_width)))
        if bin_count is not None:
            return asyncio.run(fetch_last_candle(start_obj, end_obj, symbol="BTCUSDT", bin_count=float(bin_count)))
        
@app.route("/api/aggtrade", methods = ['GET'])
def get_aggtrade_t():
    if request.method == 'GET':
        t = request.args.get("t")
        if t is None:
            return []
        return asyncio.run(fetch_aggtrade_t(float(t)))

    
if __name__ == "__main__":
    app.run(debug = True)