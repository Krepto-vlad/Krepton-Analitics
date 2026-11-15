"""Draw the logical schema. That figure is the ER diagram: relations, keys, and cardinalities.

Same palette as the business-analysis figures: Arial, slate lines, blue fill.
Run from the repository root:

    python Docs/database/draw_schema.py
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

OUTPUT_DIR = Path(__file__).resolve().parent
LINE = "#44546A"
HEADER = "#D9E2F3"
ZONE = "#F7F9FC"
DASH = "#7F7F7F"

ROW_HEIGHT = 0.32
HEADER_HEIGHT = 0.42


def draw_zone(axis, x, y, width, height, title):
    patch = FancyBboxPatch(
        (x, y),
        width,
        height,
        boxstyle="round,pad=0.02,rounding_size=0.12",
        facecolor=ZONE,
        edgecolor="#D0D7E2",
        linewidth=1.0,
        zorder=0,
    )
    axis.add_patch(patch)
    axis.text(x + 0.18, y + height - 0.28, title, ha="left", va="center", fontsize=11, color=LINE, fontweight="bold", zorder=1)


def draw_entity(axis, x, y, width, title, attributes):
    height = HEADER_HEIGHT + ROW_HEIGHT * max(len(attributes), 1)
    axis.add_patch(Rectangle((x, y), width, height, facecolor="white", edgecolor=LINE, linewidth=1.15, zorder=2))
    axis.add_patch(
        Rectangle((x, y + height - HEADER_HEIGHT), width, HEADER_HEIGHT, facecolor=HEADER, edgecolor=LINE, linewidth=1.15, zorder=3)
    )
    axis.text(
        x + width / 2,
        y + height - HEADER_HEIGHT / 2,
        title,
        ha="center",
        va="center",
        fontsize=8.5,
        fontweight="bold",
        color=LINE,
        zorder=4,
    )
    for index, (label, kind) in enumerate(attributes):
        text_y = y + height - HEADER_HEIGHT - ROW_HEIGHT * (index + 0.5)
        weight = "bold" if kind in {"PK", "PKFK"} else "normal"
        axis.text(x + 0.1, text_y, label, ha="left", va="center", fontsize=7.4, color=LINE, fontweight=weight, zorder=4)
    return {"x": x, "y": y, "w": width, "h": height}


def side_point(box, side):
    if side == "left":
        return box["x"], box["y"] + box["h"] / 2
    if side == "right":
        return box["x"] + box["w"], box["y"] + box["h"] / 2
    if side == "top":
        return box["x"] + box["w"] / 2, box["y"] + box["h"]
    return box["x"] + box["w"] / 2, box["y"]


def connect(axis, start_box, start_side, end_box, end_side, start_card, end_card, label, dashed=False):
    start = side_point(start_box, start_side)
    end = side_point(end_box, end_side)
    axis.annotate(
        "",
        xy=end,
        xytext=start,
        arrowprops={
            "arrowstyle": "-",
            "color": DASH if dashed else LINE,
            "linewidth": 1.05,
            "linestyle": (0, (4, 2)) if dashed else "solid",
            "shrinkA": 0,
            "shrinkB": 0,
        },
        zorder=1,
    )
    card_shift = {
        "right": (0.08, 0.16, "left", "bottom"),
        "left": (-0.08, 0.16, "right", "bottom"),
        "top": (0.1, 0.08, "left", "bottom"),
        "bottom": (0.1, -0.1, "left", "top"),
    }
    for point, side, card in ((start, start_side, start_card), (end, end_side, end_card)):
        dx, dy, ha, va = card_shift[side]
        axis.text(point[0] + dx, point[1] + dy, card, fontsize=7.5, color=LINE, ha=ha, va=va, zorder=5, fontweight="bold")
    if label:
        mid_x = (start[0] + end[0]) / 2
        mid_y = (start[1] + end[1]) / 2
        axis.text(
            mid_x,
            mid_y + 0.16,
            label,
            fontsize=7.2,
            color=DASH if dashed else LINE,
            ha="center",
            va="bottom",
            zorder=5,
            style="italic",
        )


def save(figure, name):
    figure.savefig(OUTPUT_DIR / name, dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(figure)


def draw_logical_schema():
    figure, axis = plt.subplots(figsize=(18.6, 12.4))
    axis.set_xlim(0, 18.6)
    axis.set_ylim(0, 12.4)
    axis.axis("off")
    plt.rcParams["font.family"] = "Arial"
    axis.set_title("Logical schema (ER diagram)", fontsize=14, color=LINE, fontweight="bold", loc="left", pad=8)

    draw_zone(axis, 0.15, 0.45, 10.15, 11.45, "Login identity")
    draw_zone(axis, 10.45, 0.45, 7.95, 11.45, "Holdings")

    ai_news = draw_entity(
        axis, 0.4, 9.15, 3.15, "ai_news_summaries",
        [("PK   id", "PK"), ("FK   user_id", "FK"), ("tickers_key", ""), ("summary_date", "")],
    )
    ai_usage = draw_entity(
        axis, 3.75, 9.15, 3.15, "ai_usage_events",
        [("PK   id", "PK"), ("FK   user_id", "FK"), ("feature", ""), ("created_at", "")],
    )
    billing_customers = draw_entity(
        axis, 7.1, 9.45, 2.95, "billing_customers",
        [("PK FK  user_id", "PKFK"), ("UK   paddle_customer_id", "UK")],
    )
    users = draw_entity(
        axis, 3.55, 5.85, 3.35, "users",
        [("PK   id", "PK"), ("UK   email", "UK"), ("password_hash", ""), ("UK   google_sub", "UK"), ("email_verified", "")],
    )
    billing_entitlements = draw_entity(
        axis, 0.4, 2.55, 3.15, "billing_entitlements",
        [("PK FK  user_id", "PKFK"), ("paddle_period_end", ""), ("admin_expires_at", "")],
    )
    snaptrade = draw_entity(
        axis, 3.75, 2.85, 3.15, "snaptrade_users",
        [("PK FK  user_id", "PKFK"), ("UK   snaptrade_user_id", "UK")],
    )
    webhook = draw_entity(
        axis, 7.1, 2.7, 2.95, "billing_webhook_events",
        [("PK   event_id", "PK"), ("event_type", "")],
    )
    axis.text(8.55, 2.48, "no relationship", ha="center", fontsize=7, color=DASH, style="italic")

    portfolio = draw_entity(
        axis, 12.7, 7.55, 3.7, "portfolio_accounts",
        [("PK   id", "PK"), ("UK   owner_token", "UK"), ("rebalancing_strategy_id", "")],
    )
    positions = draw_entity(
        axis, 10.7, 0.7, 2.4, "positions",
        [("PK   id", "PK"), ("FK   portfolio_id", "FK"), ("ticker", ""), ("shares", ""), ("avg_buy_price", ""), ("currency", "")],
    )
    transactions = draw_entity(
        axis, 13.25, 0.75, 2.5, "transactions",
        [("PK   id", "PK"), ("FK   portfolio_id", "FK"), ("transaction_type", ""), ("shares", ""), ("price_per_share", ""), ("source", "")],
    )
    watchlist = draw_entity(
        axis, 15.9, 1.05, 2.3, "watchlist_items",
        [("PK   id", "PK"), ("FK   portfolio_id", "FK"), ("ticker", "")],
    )

    connect(axis, users, "top", ai_news, "bottom", "1", "0..*", "")
    connect(axis, users, "top", ai_usage, "bottom", "1", "0..*", "")
    connect(axis, users, "top", billing_customers, "bottom", "1", "0..1", "")
    connect(axis, users, "bottom", billing_entitlements, "top", "1", "0..1", "")
    connect(axis, users, "bottom", snaptrade, "top", "1", "0..1", "")
    connect(axis, users, "right", portfolio, "left", "1", "0..1", "HMAC owner_token, not a FK", dashed=True)
    connect(axis, portfolio, "bottom", transactions, "top", "1", "0..*", "")
    connect(axis, portfolio, "bottom", positions, "top", "1", "0..*", "")
    connect(axis, portfolio, "bottom", watchlist, "top", "1", "0..*", "")

    axis.text(
        0.35,
        0.12,
        "Solid line: foreign key, ON DELETE CASCADE.    Dashed line: HMAC in the application, no database foreign key.    PK primary key, FK foreign key, UK unique.",
        fontsize=8,
        color=LINE,
        ha="left",
    )
    save(figure, "logical-schema.png")


if __name__ == "__main__":
    draw_logical_schema()
