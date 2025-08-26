# Binance L2 Order Flow (Perpetual Futures)

This project shows how to:
1. Maintain a **real-time full order book** from Binance USDT-margined futures (BTCUSDT by default).
2. Compute **order-flow (buy/sell taker volume)** per price level from the trade stream.
3. Render a **local real-time footprint heatmap** (price vs time, colored by delta).

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python binance_orderflow.py --symbol BTCUSDT --bucket 1 --levels 100 --tick 0.5
```

- `--bucket`: time bucket in **seconds** (default 1s).
- `--levels`: number of price levels to track above/below mid (default 100 on each side).
- `--tick`: price resolution for footprint cells (in quote increments).

Press `q` in the plot window to quit cleanly.

## How it works

- **Order book**:
  - Fetch REST snapshot: `GET https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=1000`.
  - Connect to **diff depth** stream: `wss://fstream.binance.com/ws/btcusdt@depth@100ms`.
  - Discard updates until you're past the snapshot's `lastUpdateId`, then apply in order.
  - Maintain in-memory maps for bids (price->qty) and asks (price->qty).

- **Trades / Order flow**:
  - Subscribe to trades: `wss://fstream.binance.com/ws/btcusdt@trade`.
  - For each trade `m` (buyer is market maker flag):
    - If `m == false` → **taker is buyer** (buy-initiated; add to AskVol).
    - If `m == true`  → **taker is seller** (sell-initiated; add to BidVol).

- **Footprint**:
  - Bucket trades by time (e.g., 1s) and by price cell size (`--tick`).
  - Compute **delta = buyVol - sellVol** per (time, price) cell.
  - Display as a rolling heatmap (newest time on the right).

## Notes

- This is a minimal reference. For production, consider persistence, reconnections, jitter handling,
  and better separation of cancels vs fills (the trade stream already encodes aggressor).
- Requires Python 3.10+.
# Orderflow-Footprint
