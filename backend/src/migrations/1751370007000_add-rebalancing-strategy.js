/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns('portfolio_accounts', {
    rebalancing_strategy_id: {
      type: 'varchar(64)',
      notNull: true,
      default: 'ray-dalio-all-weather',
    },
    rebalancing_custom_allocations: {
      type: 'jsonb',
      notNull: false,
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumns('portfolio_accounts', [
    'rebalancing_strategy_id',
    'rebalancing_custom_allocations',
  ]);
};
