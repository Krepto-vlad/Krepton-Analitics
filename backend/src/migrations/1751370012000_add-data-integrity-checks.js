/**
 * Data-quality CHECKs that match service-layer invariants.
 * Product-relevant: bad imports or raw SQL cannot store empty lots or junk ISO codes.
 *
 * Keep expressions aligned with backend/src/constants.ts
 * (TICKER_FORMAT_PATTERN, ALLOWED_CURRENCIES, TRANSACTION_TYPES, MAX_SHARES, MAX_PRICE, AI_FEATURES).
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addConstraint('users', 'users_has_password_or_google_check', {
    check: 'password_hash IS NOT NULL OR google_sub IS NOT NULL',
  });

  pgm.addConstraint('portfolio_accounts', 'portfolio_accounts_owner_token_hex_check', {
    check: "owner_token ~ '^[0-9a-f]{64}$'",
  });

  pgm.addConstraint('portfolio_accounts', 'portfolio_accounts_strategy_id_check', {
    check: `rebalancing_strategy_id IN (
      'warren-buffett-9010',
      'ray-dalio-all-weather',
      'bogleheads-three-fund',
      'harry-browne-permanent',
      'custom'
    )`,
  });

  pgm.addConstraint('positions', 'positions_shares_positive_check', {
    check: 'shares > 0 AND shares <= 999999999',
  });

  pgm.addConstraint('positions', 'positions_avg_buy_price_positive_check', {
    check: 'avg_buy_price > 0 AND avg_buy_price <= 999999999',
  });

  pgm.addConstraint('positions', 'positions_currency_allowed_check', {
    check: "currency IN ('USD', 'EUR')",
  });

  pgm.addConstraint('positions', 'positions_ticker_format_check', {
    check: "ticker ~ '^[A-Z0-9.=^-]{1,10}$'",
  });

  pgm.addConstraint('positions', 'positions_company_name_not_blank_check', {
    check: "char_length(btrim(company_name)) > 0",
  });

  pgm.addConstraint('transactions', 'transactions_shares_positive_check', {
    check: 'shares > 0 AND shares <= 999999999',
  });

  pgm.addConstraint('transactions', 'transactions_price_positive_check', {
    check: 'price_per_share > 0 AND price_per_share <= 999999999',
  });

  pgm.addConstraint('transactions', 'transactions_currency_allowed_check', {
    check: "currency IN ('USD', 'EUR')",
  });

  pgm.addConstraint('transactions', 'transactions_ticker_format_check', {
    check: "ticker ~ '^[A-Z0-9.=^-]{1,10}$'",
  });

  pgm.addConstraint('transactions', 'transactions_type_allowed_check', {
    check: "transaction_type IN ('BUY', 'SELL')",
  });

  pgm.addConstraint('watchlist_items', 'watchlist_items_ticker_format_check', {
    check: "ticker ~ '^[A-Z0-9.=^-]{1,10}$'",
  });

  pgm.addConstraint('watchlist_items', 'watchlist_items_company_name_not_blank_check', {
    check: "char_length(btrim(company_name)) > 0",
  });

  pgm.addConstraint('ai_usage_events', 'ai_usage_events_feature_allowed_check', {
    check: `feature IN (
      'news_summary',
      'explain_alignment',
      'import_schema',
      'ticker_chat'
    )`,
  });

  pgm.addConstraint('ai_news_summaries', 'ai_news_summaries_tickers_array_check', {
    check: "jsonb_typeof(tickers) = 'array'",
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropConstraint('ai_news_summaries', 'ai_news_summaries_tickers_array_check');
  pgm.dropConstraint('ai_usage_events', 'ai_usage_events_feature_allowed_check');
  pgm.dropConstraint('watchlist_items', 'watchlist_items_company_name_not_blank_check');
  pgm.dropConstraint('watchlist_items', 'watchlist_items_ticker_format_check');
  pgm.dropConstraint('transactions', 'transactions_type_allowed_check');
  pgm.dropConstraint('transactions', 'transactions_ticker_format_check');
  pgm.dropConstraint('transactions', 'transactions_currency_allowed_check');
  pgm.dropConstraint('transactions', 'transactions_price_positive_check');
  pgm.dropConstraint('transactions', 'transactions_shares_positive_check');
  pgm.dropConstraint('positions', 'positions_company_name_not_blank_check');
  pgm.dropConstraint('positions', 'positions_ticker_format_check');
  pgm.dropConstraint('positions', 'positions_currency_allowed_check');
  pgm.dropConstraint('positions', 'positions_avg_buy_price_positive_check');
  pgm.dropConstraint('positions', 'positions_shares_positive_check');
  pgm.dropConstraint('portfolio_accounts', 'portfolio_accounts_strategy_id_check');
  pgm.dropConstraint('portfolio_accounts', 'portfolio_accounts_owner_token_hex_check');
  pgm.dropConstraint('users', 'users_has_password_or_google_check');
};
