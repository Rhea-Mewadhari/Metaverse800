import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "processed"

CHART_FILES = {
    "trend": "aapl_trend.json",
    "forecast": "aapl_forecast.json",
    "monte-carlo": "aapl_montecarlo.json",
    "volatility": "aapl_volatility.json",
    "correlation": "correlation_matrix.json",
}


def summarize_chart(chart_id: str) -> str:
    filename = CHART_FILES.get(chart_id)
    if not filename:
        return "No chart is currently in view."

    path = DATA_DIR / filename
    if not path.exists():
        return f"Data for '{chart_id}' hasn't been generated yet."

    data = json.loads(path.read_text())

    if chart_id == "trend":
        return (
            f"{data['ticker']} close vs {data['window']}-day moving average. "
            f"Latest close: ${data['close'][-1]:.2f}, latest average: ${data['sma'][-1]:.2f}. "
            f"Range over the period: ${min(data['close']):.2f} to ${max(data['close']):.2f}."
        )

    if chart_id == "forecast":
        mae_text = (
            f"The forecast's actual error was ${data['mean_absolute_error']:.2f} on average (MAE)."
            if data.get("mean_absolute_error") is not None else ""
        )
        return (
            f"A linear regression trained on the last {data['trained_on_days']} days of "
            f"{data['ticker']} projects {data['forecast_days']} days ahead, from "
            f"${data['history_close'][-1]:.2f} to a predicted ${data['predicted'][-1]:.2f}. {mae_text}"
        )

    if chart_id == "monte-carlo":
        finals = [p[-1] for p in data["paths"]]
        return (
            f"{data['n_sims']} simulated {data['n_days']}-day price paths for {data['ticker']}, "
            f"starting from ${data['last_known_price']:.2f} on {data['last_known_date']}. "
            f"Simulated outcomes range from ${min(finals):.2f} to ${max(finals):.2f}."
        )

    if chart_id == "volatility":
        vals = data["annualized_volatility_pct"]
        avg = sum(vals) / len(vals)
        return (
            f"{data['ticker']}'s {data['window']}-day annualized volatility ranges from "
            f"{min(vals):.1f}% to {max(vals):.1f}%, averaging {avg:.1f}%."
        )

    if chart_id == "correlation":
        tickers = data["tickers"]
        matrix = data["matrix"]
        pairs = []
        for i in range(len(tickers)):
            for j in range(i + 1, len(tickers)):
                pairs.append(f"{tickers[i]}-{tickers[j]}: {matrix[i][j]:.2f}")
        return f"Correlation of daily returns among {', '.join(tickers)}. " + "; ".join(pairs)

    return "No summary available for this chart."