# Technical Analysis Tools

## Decision

Agent Chat supports five deterministic, close-only indicators: SMA, EMA, RSI, MACD, and Bollinger
Bands. The model chooses a bounded research tool and explains the result; pure TypeScript owns
sorting, arithmetic, classification, and chart-series generation.

All indicators use Massive adjusted daily closing prices. Complete daily series travel directly to
React through the typed content-block side channel, while Ollama receives only the latest values,
classifications, crossover context, limitations, and source IDs.

## Tool organization

| Tool                              | Indicators      | Research question                                  |
| --------------------------------- | --------------- | -------------------------------------------------- |
| `calculate_moving_averages`       | SMA and EMA     | Where is price relative to a smoothed trend?       |
| `calculate_momentum_indicators`   | RSI and MACD    | Is closing-price momentum strengthening or fading? |
| `calculate_volatility_indicators` | Bollinger Bands | How dispersed is price around its rolling mean?    |

Grouping related indicators keeps combined technical questions within the four-tool agent limit
without creating one tool for every formula.

## SMA and EMA

The moving-average tool accepts one to six integer periods from 2 through 250 and one or both
average types. Common periods remain `5`, `10`, `20`, `50`, `100`, and `200`.

```ts
calculate_moving_averages({
  ticker: 'AAPL',
  periods: [20, 50, 200],
  averageTypes: ['sma', 'ema'],
});
```

- SMA is the arithmetic mean of the latest `N` closing prices.
- EMA starts with the SMA of its first `N` observations, then applies `2 / (N + 1)` as the
  exponential multiplier.
- Each available result includes value, latest-price distance, and `above`, `below`, or `equal`.
- Insufficient history is explicit rather than replaced with a partial-period calculation.

The price chart renders the complete close and average series. When SMA and EMA are requested
together, the chart defaults to a focused SMA view and offers `SMA`, `EMA`, and opt-in `Compare
all` controls. Each visible series also has an accessible toggle, so users can isolate one period
without making another provider request.

## RSI

RSI defaults to 14 sessions and accepts periods from 2 through 50. The implementation uses Wilder's
recursive smoothing after the initial average gain and loss.

```text
RS = average gain / average loss
RSI = 100 - 100 / (1 + RS)
```

Deterministic edge cases:

- No gains and no losses: RSI 50.
- Gains with no losses: RSI 100.
- Losses with no gains: RSI 0.

The chart includes 30 and 70 reference lines. These are conventional context markers, not automatic
oversold, overbought, buy, or sell conclusions.

## MACD

MACD defaults to `12/26/9`, and the tool allows validated custom fast, slow, and signal periods. The
slow period must be greater than the fast period.

```text
MACD line = fast EMA - slow EMA
Signal line = EMA of the MACD line
Histogram = MACD line - signal line
```

The compact result reports the latest three values, whether MACD is above or below the signal and
zero lines, and the latest deterministic bullish or bearish signal-line crossover found in the
bounded history. The chart includes MACD, signal, histogram-value series, and a zero reference line.

## Bollinger Bands

Bollinger Bands default to a 20-session middle SMA plus or minus two population standard
deviations. The period accepts 2–100 and the multiplier accepts 0.5–4.

```text
Middle = rolling SMA
Upper = middle + multiplier × population standard deviation
Lower = middle - multiplier × population standard deviation
```

The compact result includes the three bands, band width as a percentage of the middle band,
percent-B, and whether the latest close is above, below, or within the bands. Bollinger Bands use a
separate volatility chart so their price envelope does not overload the moving-average trend chart.

## Presentation structure

Broad technical-analysis answers use a short model-written overall takeaway followed by typed UI
sections in a fixed order:

1. **Trend** — moving-average charts and their latest deterministic context.
2. **Momentum** — RSI and MACD charts.
3. **Volatility** — Bollinger Bands and their latest price position.

Each technical chart declares its domain in the shared content contract. React groups by that
metadata instead of parsing model-generated Markdown headings, so chart placement remains stable
when wording changes or another indicator is added.

## Shared guardrails

- Calculations are reproducible pure TypeScript functions with synthetic-data tests.
- Inputs are bounded by Zod before market data is requested.
- The per-run context reuses one cached 365-day Massive request across price and technical tools.
- Raw daily bars do not enter the model context.
- Reference levels, crossovers, and band touches describe historical behavior; none are trading
  recommendations or backtested strategies.
- Recently listed or sparse securities may produce explicit insufficient-data results.

## Deferred indicators

ATR requires high and low prices, while relative volume and OBV require volume. Those indicators
remain deferred until the normalized `MarketBar` contract is expanded beyond closing prices.
