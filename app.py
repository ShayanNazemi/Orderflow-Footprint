import json
import pandas as pd
from flask import Flask, request
import asyncio, asyncpg
from datetime import datetime
from flask_cors import CORS

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