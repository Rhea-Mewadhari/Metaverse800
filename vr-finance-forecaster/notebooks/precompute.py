"""
precompute.py — pulls Yahoo Finance data, fits a simple forecast model,
and writes JSON files the frontend charts read directly (no live model
inference needed in the VR app itself).

Run:
    python precompute.py --ticker AAPL --period 2y

Outputs (into ./data/processed/):
    <ticker>_trend.json      -> chart 1: price + moving average
    <ticker>_forecast.json   -> chart 2: regression forecast vs actual
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"

def fetch_history(ticker: str, period: str) -> pd.DataFrame:
    """Download daily OHLCV data and return a clean, flat DataFrame."""
    df = yf.download(ticker, period=period, interval="1d", auto_adjust=True, progress=False)
    if df.empty:
        raise RuntimeError(
            f"No data returned for '{ticker}'. Check the ticker symbol and your internet connection."
        )
    # yfinance sometimes returns MultiIndex columns (field, ticker) — flatten them
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.reset_index()
    df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
    return df[["Date", "Open", "High", "Low", "Close", "Volume"]]


def build_trend_chart(df: pd.DataFrame, ticker: str, window: int = 20) -> dict:
    """Chart 1: raw close price vs a smoothed moving-average trend line."""
    sma = df["Close"].rolling(window=window, min_periods=1).mean()
    return {
        "chart": "trend",
        "ticker": ticker,
        "window": window,
        "dates": df["Date"].tolist(),
        "close": df["Close"].round(2).tolist(),
        "sma": sma.round(2).tolist(),
    }


def build_forecast_chart(df: pd.DataFrame, ticker: str, forecast_days: int = 30) -> dict:
    """
    Chart 2: fits linear regression on the last 90 trading days, projects
    `forecast_days` ahead. Where later actuals exist in the pulled history,
    shows predicted vs actual so students see the forecast's real error —
    this is the teaching moment, not the regression itself.
    """
    lookback = 90
    recent = df.tail(lookback).reset_index(drop=True)
    X = np.arange(len(recent)).reshape(-1, 1)
    y = recent["Close"].values

    model = LinearRegression().fit(X, y)

    future_X = np.arange(len(recent), len(recent) + forecast_days).reshape(-1, 1)
    predicted = model.predict(future_X)

    has_actuals = len(df) > lookback + forecast_days
    actual_future = df["Close"].tail(forecast_days).values if has_actuals else None
    mae = (
        float(mean_absolute_error(actual_future, predicted[: len(actual_future)]))
        if has_actuals else None
    )

    return {
        "chart": "forecast",
        "ticker": ticker,
        "trained_on_days": lookback,
        "forecast_days": forecast_days,
        "history_dates": recent["Date"].tolist(),
        "history_close": recent["Close"].round(2).tolist(),
        "predicted": [round(v, 2) for v in predicted.tolist()],
        "actual_future": [round(v, 2) for v in actual_future.tolist()] if has_actuals else None,
        "mean_absolute_error": round(mae, 2) if mae is not None else None,
    }

def build_volatility_chart(df: pd.DataFrame, ticker: str, window: int = 20) -> dict:
    """
    Chart 4: rolling annualized volatility — the point is that forecast
    confidence isn't constant, it swings with how turbulent the market's
    recently been. Complements the single-line forecast in chart 2.
    """
    daily_returns = df["Close"].pct_change()
    rolling_vol = daily_returns.rolling(window=window).std() * np.sqrt(252)  # annualized
    valid = rolling_vol.dropna()
    valid_dates = df["Date"].iloc[valid.index]

    return {
        "chart": "volatility",
        "ticker": ticker,
        "window": window,
        "dates": valid_dates.tolist(),
        "annualized_volatility_pct": (valid * 100).round(2).tolist(),
    }


def build_monte_carlo_chart(df: pd.DataFrame, ticker: str, n_sims: int = 40, n_days: int = 60, seed: int = 42) -> dict:
    """
    Chart 3: simulates `n_sims` possible future price paths `n_days` ahead
    using geometric Brownian motion calibrated to the stock's own historical
    daily log returns. This is the VR "cone of possibility" — walking into
    it shows uncertainty widening over time, which a single-line forecast hides.
    """
    log_returns = np.log(df["Close"] / df["Close"].shift(1)).dropna()
    mu, sigma = log_returns.mean(), log_returns.std()

    rng = np.random.default_rng(seed)
    last_price = float(df["Close"].iloc[-1])

    daily_shocks = rng.normal(mu, sigma, size=(n_sims, n_days))
    log_paths = np.cumsum(daily_shocks, axis=1)
    price_paths = last_price * np.exp(log_paths)
    price_paths = np.hstack([np.full((n_sims, 1), last_price), price_paths])  # every path starts at the same known point

    return {
        "chart": "monte_carlo",
        "ticker": ticker,
        "last_known_date": df["Date"].iloc[-1],
        "last_known_price": round(last_price, 2),
        "n_sims": n_sims,
        "n_days": n_days,
        "daily_mu": float(mu),
        "daily_sigma": float(sigma),
        "paths": [[round(p, 2) for p in path] for path in price_paths.tolist()],
    }


def build_correlation_chart(tickers: list, period: str) -> dict:
    """
    Chart 5: correlation matrix of daily returns across multiple tickers —
    the "why diversify" chart. Needs 2+ tickers pulled together so the
    trading dates line up before computing returns.
    """
    closes = {}
    for t in tickers:
        t_df = fetch_history(t, period)
        closes[t] = t_df.set_index("Date")["Close"]

    price_df = pd.DataFrame(closes).dropna()
    returns = price_df.pct_change().dropna()
    corr = returns.corr()

    return {
        "chart": "correlation",
        "tickers": tickers,
        "period": period,
        "matrix": corr.round(3).values.tolist(),  # matrix[i][j] = corr(tickers[i], tickers[j])
    }


def save_json(data: dict, name: str):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"{name}.json"
    path.write_text(json.dumps(data, indent=2))
    print(f"wrote {path}  ({path.stat().st_size} bytes)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", default="AAPL")
    parser.add_argument("--period", default="2y", help="e.g. 6mo, 1y, 2y, 5y")
    parser.add_argument("--correlate", default=None,
                         help="comma-separated tickers for the correlation chart, e.g. AAPL,MSFT,GOOGL,AMZN")
    args = parser.parse_args()

    print(f"Fetching {args.ticker} ({args.period})...")
    df = fetch_history(args.ticker, args.period)
    print(f"Got {len(df)} rows, {df['Date'].iloc[0]} -> {df['Date'].iloc[-1]}")

    save_json(build_trend_chart(df, args.ticker), f"{args.ticker.lower()}_trend")
    save_json(build_forecast_chart(df, args.ticker), f"{args.ticker.lower()}_forecast")
    save_json(build_volatility_chart(df, args.ticker), f"{args.ticker.lower()}_volatility")
    save_json(build_monte_carlo_chart(df, args.ticker), f"{args.ticker.lower()}_montecarlo")

    if args.correlate:
        tickers = [t.strip().upper() for t in args.correlate.split(",")]
        print(f"Building correlation chart for {tickers}...")
        save_json(build_correlation_chart(tickers, args.period), "correlation_matrix")


if __name__ == "__main__":
    main()