#!/usr/bin/env python3
"""
Builds data/total-market-cap-monthly.json, the series behind the homepage
"Total Crypto Market Cap History" chart (components/market-cap-chart.js).

    python3 tools/build-market-cap-data.py

Downloads three public datasets (no API keys), takes one value per month,
cross-checks it, and writes the JSON. Run it again to bring the series up to
date. Method (also written into the file's "meta"):

  2009-01 .. 2010-02  infancy      No exchange existed: marketCapUsd is null.
  2010-03 .. 2010-06  btc-only     BitcoinMarket.com traded from March 2010,
                                   but no continuous price archive survives:
                                   null, not estimated.
  2010-07 .. 2013-03  btc-only     Bitcoin market cap, Coin Metrics Community
                                   Data (btc.csv, CapMrktCurUSD) on the month's
                                   last day (end of day, UTC). First price:
                                   18 July 2010 (Mt. Gox).
  2013-04 ..          total-market Total crypto market cap, CoinMarketCap
                                   global metrics: the 00:00 UTC snapshot on the
                                   1st of the next month, i.e. the close of the
                                   month's last day. CoinMarketCap's series
                                   starts 29 April 2013.

The current month has not closed: its value is the latest snapshot, and its
note says so.

Cross-checks, printed and stored in meta.crossChecks: Bitcoin market cap from
blockchain.com's chart API against Coin Metrics, and CoinMarketCap's implied
Bitcoin market cap (total x dominance) against Coin Metrics. Any difference
over 10% is flagged.
"""
import csv
import datetime as dt
import io
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "total-market-cap-monthly.json")

COINMETRICS_URL = "https://raw.githubusercontent.com/coinmetrics/data/master/csv/btc.csv"
BLOCKCHAIN_URL = "https://api.blockchain.info/charts/market-cap?timespan=all&format=json&sampled=false"
CMC_URL = ("https://api.coinmarketcap.com/data-api/v3/global-metrics/quotes/historical"
           "?format=chart&interval=1d&timeStart={start}&timeEnd={end}")

SRC_COINMETRICS = "Coin Metrics Community Data, btc.csv (CapMrktCurUSD): https://github.com/coinmetrics/data"
SRC_CMC = "CoinMarketCap global metrics, total market cap: https://coinmarketcap.com/charts/"
SRC_BLOCKCHAIN = "blockchain.com Charts API, market-cap: https://www.blockchain.com/explorer/charts/market-cap"

FIRST_EXCHANGE = "2010-03"   # BitcoinMarket.com opens
FIRST_PRICE = "2010-07"      # first month with a continuous price archive
FIRST_TOTAL = "2013-04"      # CoinMarketCap's aggregate series begins
FLAG = 0.10


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "canaryalpha-data-build"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def months(first, last):
    y, m = map(int, first.split("-"))
    while "%04d-%02d" % (y, m) <= last:
        yield "%04d-%02d" % (y, m)
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def last_day(month):
    y, m = map(int, month.split("-"))
    nxt = dt.date(y + 1, 1, 1) if m == 12 else dt.date(y, m + 1, 1)
    return nxt - dt.timedelta(days=1)


def coinmetrics():
    rows = csv.DictReader(io.StringIO(fetch(COINMETRICS_URL).decode()))
    return {r["time"][:10]: float(r["CapMrktCurUSD"]) for r in rows if r.get("CapMrktCurUSD")}


def blockchain():
    # Several readings a day in the early years: keep the day's last one.
    out = {}
    for v in json.loads(fetch(BLOCKCHAIN_URL))["values"]:
        if v["y"] > 0:
            out[dt.datetime.utcfromtimestamp(v["x"]).strftime("%Y-%m-%d")] = v["y"]
    return out


def cmc():
    # The endpoint returns at most 2,200 days per call.
    out = {}
    start = int(dt.datetime(2013, 4, 28, tzinfo=dt.timezone.utc).timestamp())
    now = int(time.time())
    while start < now:
        end = min(start + 2000 * 86400, now)
        body = json.loads(fetch(CMC_URL.format(start=start, end=end)))
        for q in body["data"]["quotes"]:
            usd = q["quote"][0]
            out[q["timestamp"][:10]] = (float(usd["totalMarketCap"]), float(q["btcDominance"]), q["timestamp"])
        start = end
        time.sleep(1)
    return out


def main():
    cm, bc, total = coinmetrics(), blockchain(), cmc()
    today = dt.datetime.utcnow().date()
    current = today.strftime("%Y-%m")
    latest_day = max(total)
    records, checks = [], []

    for month in months("2009-01", current):
        end = last_day(month)
        rec = {"date": month, "marketCapUsd": None, "era": None, "source": None, "note": ""}
        if month < FIRST_EXCHANGE:
            rec.update(era="infancy", note="No exchange existed yet, so bitcoin had no market price.")
        elif month < FIRST_PRICE:
            rec.update(era="btc-only", note="Traded on BitcoinMarket.com, but no continuous price archive "
                       "survives for these months; left blank rather than estimated.")
        elif month < FIRST_TOTAL:
            day = end.isoformat()
            rec.update(era="btc-only", marketCapUsd=round(cm[day]), source=SRC_COINMETRICS,
                       note="Bitcoin only, end of day %s UTC." % day)
            if day in bc:
                checks.append(("btc", month, cm[day], bc[day], "blockchain.com"))
        else:
            snap = (end + dt.timedelta(days=1)).isoformat()
            partial = snap > latest_day
            key = latest_day if partial else snap
            cap, dom, stamp = total[key]
            note = ("Month not closed: latest snapshot, %s." % stamp if partial
                    else "Close of %s (snapshot %s)." % (end.isoformat(), stamp))
            rec.update(era="total-market", marketCapUsd=round(cap), source=SRC_CMC, note=note)
            if not partial and end.isoformat() in cm:
                checks.append(("cmc-btc", month, cm[end.isoformat()], cap * dom / 100, "CoinMarketCap BTC share"))
        records.append(rec)

    cross = []
    for kind, month, a, b, other in checks:
        diff = (b - a) / a
        cross.append({"date": month, "check": kind, "coinMetricsBtcUsd": round(a),
                      "otherUsd": round(b), "other": other, "diffPct": round(diff * 100, 2),
                      "flagged": abs(diff) > FLAG})

    meta = {
        "title": "Total crypto market cap, monthly",
        "generated": today.isoformat(),
        "method": "One value per month: the close of the month's last day (UTC). "
                  "Bitcoin only (Coin Metrics) from July 2010 to March 2013; total crypto "
                  "market cap (CoinMarketCap) from April 2013. Null where no market price "
                  "existed or no continuous archive survives. Nothing is interpolated.",
        "eras": {
            "infancy": "Jan 2009 to Feb 2010: no exchange, no market price.",
            "btc-only": "Mar 2010 to Mar 2013: Bitcoin market cap only (data from Jul 2010).",
            "total-market": "Apr 2013 onward: total crypto market cap."
        },
        "sources": [SRC_COINMETRICS, SRC_CMC, SRC_BLOCKCHAIN + " (cross-check only)"],
        "crossChecks": cross
    }
    with open(OUT, "w") as f:
        json.dump({"meta": meta, "months": records}, f, indent=1)
        f.write("\n")

    flagged = [c for c in cross if c["flagged"]]
    print("wrote %s: %d months, %d with values" % (OUT, len(records),
          sum(r["marketCapUsd"] is not None for r in records)))
    print("cross-checks: %d, flagged over %d%%: %d" % (len(cross), FLAG * 100, len(flagged)))
    for c in flagged:
        print("  FLAG", c)
    return 0


if __name__ == "__main__":
    sys.exit(main())
