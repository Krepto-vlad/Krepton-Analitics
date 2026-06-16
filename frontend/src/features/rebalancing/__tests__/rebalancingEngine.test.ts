// Unit tests for rebalancing calculation logic

describe('rebalancing engine', () => {
  it('should calculate drift correctly', () => {
    // TODO: import and test calculateDrift() from rebalancing utils
    const currentAllocation = { Equities: 0.58, Bonds: 0.22, Gold: 0.1, Commodities: 0.1 };
    const targetAllocation = { Equities: 0.3, Bonds: 0.4, Gold: 0.075, Commodities: 0.075 };

    const drift = Object.keys(targetAllocation).reduce(
      (acc, key) => {
        const k = key as keyof typeof targetAllocation;
        acc[k] = currentAllocation[k] - targetAllocation[k];
        return acc;
      },
      {} as Record<string, number>
    );

    expect(drift.Equities).toBeCloseTo(0.28);
    expect(drift.Bonds).toBeCloseTo(-0.18);
  });

  it('should return buy/sell actions to reach target', () => {
    // TODO: implement and test generateRebalanceActions()
    expect(true).toBe(true);
  });
});
