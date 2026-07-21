/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  pgm.addColumn('portfolio_accounts', {
    rebalancing_custom_base_strategy_id: {
      type: 'varchar(64)',
      notNull: false,
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const down = (pgm) => {
  pgm.dropColumn('portfolio_accounts', 'rebalancing_custom_base_strategy_id');
};
