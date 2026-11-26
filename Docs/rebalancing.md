# Rebalancing

How the rebalancing feature works today. This is a description of behavior, not a design proposal.

The page compares the user's current holdings with a target mix. It shows how far each sleeve sits from that mix. It does not place orders, and it does not tell the user to buy or sell a security.

## Where the pieces live

| Piece | Role |
| --- | --- |
| Strategy catalog | Four published mixes plus one saved custom target. Defined on the backend. The browser does not invent buckets. |
| Analysis | Backend turns positions and a saved target into current weights, target weights, deviations, a score, and a ticker-to-bucket map. |
| Account row | One portfolio account stores which strategy is active and, if the user saved one, the custom weights. |
| Rebalancing page | Loads the catalog and the analysis, lets the user switch the target, edit weights locally, and save those weights as a custom target. |
| Reading dialog | Explains the selected published model. It does not change the saved target. |
| AI Insights tab | Asks the model to explain the already computed drift. Separate from the calculator. |
| Dashboard health card | Shows the same score and the largest drifts. |
| Chat | Knows the user is on the rebalancing screen. The numbers still come from the analysis, not from the chat. |

Backtesting has its own page and its own weights. The two pages share the idea of sliders that must add up to 100%. They do not share a saved target.

## What is stored

The strategy belongs to the portfolio account, not to a single position.

| Field | Meaning |
| --- | --- |
| Active strategy | One of the four published ids, or `custom`. Default for a new account is All-Weather. |
| Custom base | Which published model the custom buckets were copied from. Empty until the user saves a custom target. |
| Custom weights | A map of bucket id to percent. Empty until the user saves. |

Deleting all portfolio data resets the account to All-Weather and clears the custom fields.

Positions, average prices, and sectors stay in the positions table. The analysis does not write them. Live prices come from the quote cache at request time. Nothing about the drift is cached as a table of results.

The database only allows the five known strategy ids.

## Holdings left out of the analysis

Some instruments stay on the account and still have a price, but they are not part of portfolio value, sector allocation, rebalancing, dividends, portfolio news, or AI analysis. The rule follows the Yahoo quote type: cryptocurrency, option, currency, index, future, and a few other non-fund types. If Yahoo does not return a type, futures (`=F`), forex (`=X`), indexes (`^`), and crypto pairs such as `XAUT-USD` still stay out. Ordinary stock tickers stay in when the type is missing, so a quote outage does not drop Apple.

The portfolio page lists those holdings separately. Export still includes them as stored records. Opening that ticker's own page still shows the user's lot. Broker import already skipped these kinds. Manual add and CSV are the paths that can create them.

Those holdings never reach a sleeve. A gold future such as `GC=F`, or a gold token such as `XAUT-USD`, is not the gold sleeve. Company shares, bond funds, gold funds, and commodity funds that stay inside the analysis are classified below.

## The four published models

Each model is a list of sleeves. A sleeve has a name, a target percent, a color, and rules for which holdings belong in it. The percents of a published model add up to 100.

| Model | Target shape | What the sleeves are trying to separate |
| --- | --- | --- |
| Warren Buffett 90/10 | 90% S&P 500 index fund, 10% short-term treasuries | One broad index fund versus a small cash-like reserve |
| Ray Dalio All-Weather | 30 / 40 / 15 / 7.5 / 7.5 | Stocks, long bonds, intermediate bonds, gold, commodities |
| Bogleheads three-fund | 60 / 20 / 20 illustration | Total US stock market, total international stocks, US total bond market |
| Harry Browne permanent portfolio | 25 / 25 / 25 / 25 | Stocks, long bonds, gold, cash |

These mixes are reference shapes stored in the product. The reading dialog says they are the authors' published models, not Krepton strategies and not a recommendation.

All-Weather on this page is the public 30/40/15/7.5/7.5 illustration. The three-fund 60/20/20 weights are one illustration so the chart has a shape. The Bogleheads page does not require those percents. The sleeves themselves are the three total-market funds.

A custom target keeps the sleeves of one published model and replaces only the percents. The user cannot add a new sleeve or rename one. If the custom weights are missing or do not add up to 100, the analysis rejects that target.

## How a holding becomes a sleeve

For each open position that is still inside the analysis, the server builds a market value, then one shared asset class, then a sleeve. The class rules are the same for every model. Each model only decides which classes it accepts. No model keeps a ticker allowlist.

Market value is shares times price. A positive live quote is used. If there is no positive quote, the average buy price is used. The amount is converted into the display currency selected in the app (USD or EUR). The portfolio total is the sum of those values.

The fund facts come from Yahoo `quoteSummary`: `fundProfile.categoryName`, and `topHoldings` stock position when it is present. The name used in the rules is the quote name, then the stored company name, then the ticker. The category is compared in lowercase. The name is compared in uppercase. A company share (`EQUITY`) and a money-market quote type skip the profile call. A successful profile is cached for 24 hours. A failed lookup is cached for 5 minutes, and that fund stays `other` until the next try. `summaryDetail.averageMaturity` was empty on the treasury ETFs that were checked, so tenor comes from the fund name, not from a maturity field.

Published target percents are constants in the catalog. They do not move when Yahoo renames a category.

### Asset class, in this order

The class is one of: equities, S&P 500, US total stock market, total international stocks, long-term bonds, intermediate bonds, US aggregate bonds, gold, commodities, cash, or other. The first matching rule wins.

1. Quote type `EQUITY` is equities. That includes a single company, a gold miner, and an energy or materials company. Sector is not used. This return happens before the name is read, so a company share is never the S&P 500 class.
2. Quote type `MONEYMARKET` is cash. A category whose name contains "money market" is also cash.
3. A fund category is read next, before stock position. The table below is that step.
4. If step 3 said equities, the fund name can narrow the class. A name that says Total International, or All-World ex-US, becomes total international stocks. A name that says Emerging, or Small-cap, does not. A plain S&P 500 or "500 Index" name becomes S&P 500. A whole-US-market name becomes US total stock market: Total Stock Market, Total U.S. Stock Market, U.S. Broad Market, S&P 1500, or Total Market Index. A name that also says International, Emerging, ex-US, World, or Foreign does not. The name match allows an optional space in "S&P 500". Vanguard and Fidelity use "500 Index" for that fund. Each of these upgrades is refused when the name contains Ultra, Leveraged, Inverse, the word Bear, the word Short, 2X, or 3X, or when the category contains "leverag", "inverse", or "trading". A product such as UPRO stays equities. A company share never reaches this step.
5. If the category was missing and the reported stock position is at least one half, the class is equities. This path does not upgrade to S&P 500, US total market, or total international.
6. If the quote type is ETF or mutual fund and nothing above matched, the class is other. A missing profile must not drop a bond fund into stocks.
7. If the quote type itself is missing and there is no category, the class is equities. That keeps an ordinary stock in the stock sleeve during a quote outage. If both the quote and the profile fail, a bond ETF can temporarily look like a stock. If the quote type is ETF and only the profile fails, it stays other.

| Yahoo category | Extra test on the fund name | Class | Examples |
| --- | --- | --- | --- |
| Long Government | "7-10" or "7 to 10" | Intermediate bonds | IEF |
| Long Government | "10-20" | Other | TLH |
| Long Government | anything else | Long-term bonds | TLT, VGLT, EDV, SPTL |
| Intermediate Government | "3-7", "1-3", or "1-5", and not "7-10" | Other | IEI |
| Intermediate Government | "7-10" or the word Intermediate | Intermediate bonds | VGIT, SCHR, SPTI |
| Intermediate Government | anything else | Other | GOVT, the whole curve |
| Short Government, or Ultrashort Bond | none | Cash | SHY, VGSH, BIL, SGOV, SHV |
| Commodities Broad Basket | none | Commodities | DBC, GSG, PDBC |
| Commodities Focused | the word Gold, and not Miner | Gold | GLD, IAU, SGOL, BAR, OUNZ |
| Commodities Focused | anything else | Other | USO, UNG, SLV. GLTR stays here because "Physical Precious Metals" does not contain the word Gold |
| Intermediate Core Bond, exact category | none | US aggregate bonds | BND, AGG, VBTLX. Intermediate Core-Plus stays other |
| Category contains bond, inflation-protected, municipal, bank loan, preferred stock, or commodit | none | Other | TIP, and any bond category that is not the exact core-bond name |
| Any other named category | then the name tests in step 4 | Equities, S&P 500, US total market, or total international | VOO, SPY, IVV, SPLG, VFIAX, FXAIX, SWPPX are S&P 500. VTI, ITOT, SCHB, SPTM, and FSKAX are US total market. VXUS, VTIAX, IXUS, and an All-World ex-US fund are total international. QQQ, IWM, VWO, VT, and a developed-only international fund stay equities. GDX is equities because Equity Precious Metals is a stock category |

Yahoo uses the category Long Government for both TLT and IEF. The "7-10" phrase in the name is the only split. Holdings arrays on those ETFs were empty when this was checked, so they are not used.

A stock-looking category that is not in the table, including a balanced fund or a target-date fund, is equities. The whole fund then counts as stocks. A leveraged equity ETF is also equities unless its name or category trips the S&P 500 exclusion above.

### What each model accepts

The sleeve walk takes the first match: a ticker on that sleeve's exclude list never matches it, a ticker on its explicit list matches, otherwise the asset class matches. No match means Unmapped. Unmapped value stays in the portfolio total, so mapped sleeves can add up to less than 100%. The score only looks at the model's own sleeves.

**Warren Buffett 90/10.** The 2013 Berkshire letter, repeated later, is 90% in one low-cost S&P 500 index fund and 10% in short-term government bonds, kept as a reserve so a bad year is not funded by selling stocks. It is not "each member of the index" and it is not "everything that is not the index."

| Sleeve | Accepts | Stays Unmapped |
| --- | --- | --- |
| S&P 500, 90% | The S&P 500 class only | AAPL and any other single company. QQQ, VTI, IWM, VWO. A leveraged or inverse S&P 500 product |
| Short-Term Treasuries, 10% | Cash: Short Government, Ultrashort Bond, and money-market funds | IEF and VGIT (intermediate). TLT (long). BND and AGG (other) |

Money-market funds share the cash class, so a government or prime money-market fund lands in the 10% sleeve. That is wider than "short-term government bonds" alone.

The same S&P 500 class is also accepted by the stock sleeve of All-Weather and the permanent portfolio. VOO and VFIAX stay stocks there. The three-fund model does not accept that class.

**Ray Dalio All-Weather, 30 / 40 / 15 / 7.5 / 7.5.** The stock sleeve is every equity, plus S&P 500, US total market, and total international. The label still says Large-Cap Stocks. It is not narrowed to the S&P 500. Long bonds accept only long-term bonds. Intermediate bonds accept only intermediate bonds. Gold accepts only the gold class. Commodities accept only a broad commodity basket. Cash, aggregate bonds, a 3-7 year treasury, oil, silver, and GLTR are Unmapped on this model. Gold-miner shares and energy shares stay in the stock sleeve.

**Bogleheads three-fund, 60 / 20 / 20.** The [Bogleheads wiki](https://www.bogleheads.org/wiki/Three-fund_portfolio) names three funds: a total US stock-market fund, a total international stock fund, and a US total bond-market fund. Emerging markets sit inside the international fund. There is no required percentage. Cash is outside the portfolio. A single company is outside it. An S&P 500 fund is explicitly not the whole US market, so this page does not treat it as the US sleeve. A developed-only fund, an emerging-markets-only fund, and a total-world fund that mixes US and international in one ticker are also outside, because one holding cannot be split and a narrower fund is not the total market. The 60/20/20 weights are only an illustration. The sleeve ids are unchanged from the earlier labels, so a saved custom percent still sits on the same slider.

| Sleeve | Accepts | Stays Unmapped |
| --- | --- | --- |
| US Total Stock Market, 60% | US total stock market class only | AAPL, QQQ, IWM, VOO, SPY, VWO, VT |
| Total International Stocks, 20% | Total international class only: Total International, or All-World ex-US, and not a small-cap completion fund | VWO and other emerging-only funds. SCHF and other developed-only funds. VT |
| US Total Bond Market, 20% | Intermediate Core Bond only | TLT, IEF, SHY, TIPS, and an intermediate core-plus bond fund |

**Harry Browne permanent portfolio, 25 / 25 / 25 / 25.** Stocks accept equities, the S&P 500 class, the US total-market class, and total international. Long bonds accept long-term bonds. Gold accepts the gold class only. Cash accepts Treasury bills only: an ultrashort fund whose name says Treasury or T-bill, or a money-market fund whose name says Treasury. Examples are BIL, SGOV, SHV, and VUSXX. A 1–3 year treasury such as SHY stays in the cash class and is Unmapped here. A money-market fund that does not say Treasury, and a corporate ultrashort fund, stay Unmapped here. Buffett's 10% sleeve still accepts both the cash class and Treasury bills.

The account can turn this cash sleeve off. Saved custom weights are not changed. The other three target weights are scaled so they add up to 100, and Treasury bill holdings are left out of that score. The portfolio total on the page still includes their market value. The cash row explains that money kept outside the app is not visible. The cash slider stays in the draft. Raising another sleeve still trims the cash weight so the four saved numbers add up to 100.

### What can move without a code change

- A category rename that still contains "bond" or "commodit" becomes other, then Unmapped on All-Weather, instead of becoming stocks.
- A category rename that looks like a stock category becomes equities.
- If IEF's name loses the "7-10" phrase and Yahoo still calls it Long Government, it silently becomes a long bond. That is the fragile tenor rule.
- Tests supply fake categories. They do not watch live Yahoo, so a rename is not caught by the suite.
- A profile that fails is remembered for 5 minutes as no category. A good profile is remembered for 24 hours.

## Current weights, target weights, and the score

Current percent of a sleeve is that sleeve's market value divided by the portfolio total.

Target percent is the published number, or the saved custom number when the active strategy is custom.

Deviation is current minus target, in percentage points. A sleeve is called optimal when the absolute gap is 2 points or less. Above that, a positive gap is overweight and a negative gap is underweight. Sleeves with no current weight and no target are omitted.

The alignment score starts at 100. Half of the sum of absolute sleeve gaps is subtracted, because each gap is counted once on the high side and once on the low side. The result is rounded and cannot go below 0. A portfolio that matches every sleeve scores 100. Empty portfolios do not get a fake score: the response keeps the target and returns a score of 0, with no current bars, no deviations, and no ticker rows.

When the permanent-portfolio cash sleeve is turned off, the score ignores that sleeve. Current percents are computed from the other holdings only. The saved weights of those sleeves are scaled to 100. A book that is evenly split across stocks, long bonds, and gold then scores 100, even though the published model still says 25% cash.

## API

All of these sit under the portfolio routes and require the logged-in user. The portfolio is found from the user, not from an id in the request.

| Call | What it does |
| --- | --- |
| List strategies | Returns the four published models and their sleeves. No portfolio math. |
| Get analysis | Reads positions and the saved target, then returns the full comparison in the requested display currency. |
| Save strategy | Sets the active strategy. Saving custom also stores the base model and the weight map, and refuses a map that does not add up to 100 within a hundredth of a percent. Switching to a published model changes only the active id. Previously saved custom weights stay on the account. |
| Explain quota and explain | AI tab only. They do not change the target. |

After a successful save, the response is a fresh analysis, so the page does not have to compute the score itself.

## What the page does

On open, and again when the display currency changes, the page loads the catalog and the analysis together. The selected model and the sliders start from that response.

Changing the model in the dropdown saves immediately and replaces the analysis. Moving a slider does not save. The sliders are a draft of the same sleeves the model already has. A custom target cannot add or drop a sleeve. Raising one slider trims the others, largest first, so the draft stays at 100. Lowering one slider does not fill the gap, so the total can fall under 100. Save stays disabled until the draft is back at 100. Cancel copies the last saved weights back into the draft and does not call the server.

The target side of the comparison chart follows that draft, so the user can see the shape before saving. The current side, the ticker map, the deviations, and the score stay on the last saved analysis until the draft is saved. If the permanent cash sleeve is turned off, the chart target leaves that sleeve out and scales the other draft weights to 100. The sliders and the saved map still include it.

Save is offered when the draft differs from the baseline and the weights add up to 100. Saving stores a custom target whose sleeves come from the model the user was editing. If they were already on a saved custom target, the base stays that custom target's original model. Turning the cash sleeve off does not rewrite those saved weights. After a successful save, custom appears in the dropdown.

The reading dialog opens from the strategy panel. Its list includes every model on the page, including custom when one is saved. Switching the list only changes the essay. Closing it leaves the dropdown and the sliders as they were.

The ticker table lists each holding, the inferred asset class, the sleeve it landed in, and whether that landing came from a ticker rule, an asset class, or no rule. It is the explanation of the current bars.

A short disclaimer under the technical view says the page is a drift calculator against a target the user selected.

## AI Insights, dashboard, and chat

The AI tab sends the current saved analysis to an explanation endpoint. The model receives the strategy name, philosophy, horizon, score, material gaps, the largest holdings, and overlap hints (several equity funds that behave like the same bet). The answer is cached for that strategy, score, and drift fingerprint. A quota limits how often it can be generated. The text is an explanation of the numbers already on screen. It is not a new target and not an instruction to trade.

The dashboard health card reads the same analysis. 85 and above is labeled well aligned, 60 to 84 is moderate drift, and below 60 is high drift. A dismissible alert can point at the largest gap. Dismissing it is remembered in the browser for that strategy, not on the server.

While the rebalancing page is open, the chat drawer is told that the screen is the rebalancing target in the current display currency. The chat can talk about that screen. It does not write the strategy.

## Ticker-page asset-class badges

The ticker detail page can show one or two colored badges next to the grey Yahoo chips (sector, industry, exchange). The badges use the same class ids as the rebalancing calculator. They describe the instrument; they do not say whether it fits a strategy. The health card on the rebalancing page has a help icon that points the user at those badges and at asking the AI chat whether a ticker fits a bucket.

| Piece | Where |
| --- | --- |
| Classification with evidence | `backend/src/services/rebalancingClassification.ts` (`classifyRebalancingAssetClassDetailed`) |
| Badge assembly | `backend/src/services/assetClassService.ts` |
| HTTP | `GET /api/stocks/asset-class/:ticker` |
| UI chips and basis dialog | `frontend/src/pages/TickerDetailPage/components/AssetClassBadges` |
| Nightly Yahoo check | `.github/workflows/asset-class-sentinel.yml` (`npm run test:sentinel`) |

A badge is shown only when evidence is `explicit`: Yahoo quote type `EQUITY` or `MONEYMARKET`, or a fund category/name rule from the table above. There is no badge for fallback paths (missing quote type, stock-position heuristic, unmatched fund, class `other`, leveraged/inverse equity products, balanced and target-date funds). An S&P 500 / US total / total international fund shows a parent **Equities** badge plus the specific class. Short government and money-market cash uses the label **Short-term Treasuries / cash-like**. Clicking a badge opens a basis panel with quote type, Yahoo category, name signal, and classification time.
