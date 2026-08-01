# Technical Analysis Tools

## First indicator: simple moving averages

The conversational agent can calculate simple moving averages from Massive adjusted daily closing
prices. The model chooses the tool and its arguments; TypeScript retrieves the data and performs the
arithmetic.

The common periods are `5`, `10`, `20`, `50`, `100`, and `200`, but the tool accepts any integer
from `2` through `250` trading sessions. They are session counts, not calendar-day ranges, so a user
can request a custom period such as a 120-session average without changing the tool contract.

For each requested period, the tool returns:

- The simple moving average, calculated from the latest `N` closes.
- The latest close's percentage distance from the average.
- A neutral `above`, `below`, or `equal` price-position label.
- An explicit insufficient-data result when fewer than `N` observations are available.

## Tool contract

```text
calculate_moving_averages
├── ticker: Zod-validated U.S. ticker inferred by the model
└── periods: one to six integer values from 2 through 250
```

The default periods are `20`, `50`, and `200`. Duplicate periods are removed and results are sorted
from shortest to longest. The tool retrieves up to 365 calendar days, which covers a 120-session
average and normally provides enough observations for periods near the upper bound. Recently listed,
thinly traded, or unusually sparse securities may return an insufficient-data result.

## Design decisions

- Calculations live in a pure TypeScript module, separate from LangGraph and Massive adapters.
- The assistant context caches price history by ticker and range across market and technical tools.
- Raw daily bars stay server-side; only compact calculated output reaches Ollama.
- The result retains its Massive source ID and retrieval timestamp.
- Moving averages describe historical price behavior and never become automatic buy or sell signals.

## Deliberately deferred

- Exponential moving averages
- Moving-average crossovers
- RSI, MACD, volatility, and support or resistance levels
- Moving-average overlays on the React price chart
- Backtesting or strategy recommendations
