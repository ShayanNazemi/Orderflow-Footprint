import json
import pandas as pd
from flask import Flask, request
import asyncio, asyncpg
from datetime import datetime
from flask_cors import CORS
from decimal import Decimal, ROUND_HALF_UP


app = Flask(__name__)
CORS(app)

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


async def fetch_last_candle():
    conn = await asyncpg.connect(
        user="postgres",
        password="Asdf12345^&",
        database="binance",
        host="localhost",
        port=5432
    )

    # 1️⃣ get last candle
    candle = await conn.fetchrow("""
        SELECT *
        FROM candles
        ORDER BY bucket_time DESC
        LIMIT 1
    """)

    if not candle:
        await conn.close()
        return None

    bucket_time = candle["bucket_time"]
    symbol = candle["symbol"]

    # 2️⃣ get footprint rows for this candle
    footprint_rows = await conn.fetch("""
        SELECT price_level, taker_buyer, taker_seller
        FROM footprints
        WHERE bucket_time = $1 AND symbol = $2
        ORDER BY price_level DESC
    """, bucket_time, symbol)

    footprint = [
        {
            "price_level": float(Decimal(r["price_level"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
            "taker_buyer": float(Decimal(r["taker_buyer"]).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
            "taker_seller": float(Decimal(r["taker_seller"]).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP))
        }
        for r in footprint_rows
    ]

    result = {
        "t": bucket_time,
        "symbol": symbol,
        "open": float(Decimal(candle["open"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
        "high": float(Decimal(candle["high"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
        "low": float(Decimal(candle["low"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
        "close": float(Decimal(candle["close"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
        "volume": float(Decimal(candle["volume"]).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
        "footprint": footprint
    }

    await conn.close()
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
    

@app.route("/api/last_candle", methods = ['GET'])
def get_last_candle():
    if request.method == 'GET':
        result = asyncio.run(fetch_last_candle())
        return result