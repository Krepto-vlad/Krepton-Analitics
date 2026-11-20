import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  REBALANCING_ALLOCATION_CANCEL_LABEL,
  REBALANCING_CASH_SLEEVE_HELP_LABEL,
  REBALANCING_CASH_SLEEVE_HELP_TEXT,
  REBALANCING_CASH_SLEEVE_INCLUDE_LABEL,
  REBALANCING_STRATEGY_GUIDE_CLOSE_LABEL,
  REBALANCING_STRATEGY_GUIDE_DISCLAIMER,
  REBALANCING_STRATEGY_GUIDE_OPEN_LABEL,
  REBALANCING_STRATEGY_GUIDE_SWITCH_LABEL,
} from '../../../../../constants';
import type { StrategyPanelOption } from '../StrategyPanel';
import { StrategyPanel } from '../StrategyPanel';

const ALL_WEATHER: StrategyPanelOption = {
  id: 'ray-dalio-all-weather',
  label: 'All Weather',
  description: 'Balanced risk',
  philosophy: 'Risk parity',
  investmentHorizon: 'Long-term',
};

const BUFFETT: StrategyPanelOption = {
  id: 'warren-buffett-9010',
  label: 'Buffett 90/10',
  description: 'Equity heavy',
  philosophy: 'Stocks plus cash',
  investmentHorizon: 'Long-term',
};

const CUSTOM: StrategyPanelOption = {
  id: 'custom',
  label: 'My Custom Strategy',
  description: 'Custom allocation based on All Weather.',
  philosophy: 'Personalized target weights.',
  investmentHorizon: 'User-defined',
  guideBaseName: 'All Weather',
};

function renderPanel() {
  const onStrategyChange = jest.fn();

  render(
    <StrategyPanel
      strategyOptions={[ALL_WEATHER, BUFFETT, CUSTOM]}
      selectedStrategyId="ray-dalio-all-weather"
      allocations={[{ bucketId: 'stocks', label: 'Stocks', color: '#111111', weightPercent: 30 }]}
      isSaving={false}
      isDirty={false}
      totalWeight={30}
      isAllocationValid={false}
      onStrategyChange={onStrategyChange}
      onAllocationChange={jest.fn()}
      onStepAllocation={jest.fn()}
      onCancelDraft={jest.fn()}
      onSaveAsCustom={jest.fn()}
    />
  );

  return { onStrategyChange };
}

describe('StrategyPanel', () => {
  it('opens a full guide and switches models without changing the saved target', async () => {
    const user = userEvent.setup();
    const { onStrategyChange } = renderPanel();

    await user.click(screen.getByRole('button', { name: REBALANCING_STRATEGY_GUIDE_OPEN_LABEL }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(REBALANCING_STRATEGY_GUIDE_SWITCH_LABEL)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ray Dalio All-Weather' })).toBeInTheDocument();
    expect(screen.getByText(/not the live weights of Bridgewater/i)).toBeInTheDocument();
    expect(screen.getByText(REBALANCING_STRATEGY_GUIDE_DISCLAIMER)).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const modelSelect = within(dialog).getByRole('button', {
      name: REBALANCING_STRATEGY_GUIDE_SWITCH_LABEL,
    });
    await user.click(modelSelect);
    await user.click(within(dialog).getByRole('option', { name: BUFFETT.label }));
    expect(screen.getByRole('heading', { name: 'Warren Buffett 90/10' })).toBeInTheDocument();
    expect(screen.getByText(/2013 letter to Berkshire Hathaway shareholders/)).toBeInTheDocument();

    await user.click(modelSelect);
    await user.click(within(dialog).getByRole('option', { name: CUSTOM.label }));
    expect(screen.getByText(/not a published strategy/i)).toBeInTheDocument();
    expect(screen.getByText(/started from All Weather/)).toBeInTheDocument();
    expect(onStrategyChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: REBALANCING_STRATEGY_GUIDE_CLOSE_LABEL }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers cancel beside save and does not save when the draft is discarded', async () => {
    const user = userEvent.setup();
    const onCancelDraft = jest.fn();
    const onSaveAsCustom = jest.fn();

    render(
      <StrategyPanel
        strategyOptions={[ALL_WEATHER]}
        selectedStrategyId="ray-dalio-all-weather"
        allocations={[
          { bucketId: 'stocks', label: 'Stocks', color: '#111111', weightPercent: 28.5 },
        ]}
        isSaving={false}
        isDirty
        totalWeight={98.2}
        isAllocationValid={false}
        onStrategyChange={jest.fn()}
        onAllocationChange={jest.fn()}
        onStepAllocation={jest.fn()}
        onCancelDraft={onCancelDraft}
        onSaveAsCustom={onSaveAsCustom}
      />
    );

    await user.click(screen.getByRole('button', { name: REBALANCING_ALLOCATION_CANCEL_LABEL }));

    expect(onCancelDraft).toHaveBeenCalledTimes(1);
    expect(onSaveAsCustom).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save as Custom' })).toBeDisabled();
  });

  it('explains the permanent cash sleeve and can leave it out of the score', async () => {
    const user = userEvent.setup();
    const onIncludePermanentCashChange = jest.fn();

    render(
      <StrategyPanel
        strategyOptions={[ALL_WEATHER]}
        selectedStrategyId="harry-browne-permanent"
        allocations={[
          { bucketId: 'stocks', label: 'Stocks', color: '#111111', weightPercent: 25 },
          { bucketId: 'cash', label: 'Cash / T-Bills', color: '#94a3b8', weightPercent: 25 },
        ]}
        isSaving={false}
        isDirty={false}
        totalWeight={100}
        isAllocationValid
        showPermanentCashControls
        includePermanentCash
        onStrategyChange={jest.fn()}
        onAllocationChange={jest.fn()}
        onStepAllocation={jest.fn()}
        onCancelDraft={jest.fn()}
        onSaveAsCustom={jest.fn()}
        onIncludePermanentCashChange={onIncludePermanentCashChange}
      />
    );

    const helpButton = screen.getByRole('button', { name: REBALANCING_CASH_SLEEVE_HELP_LABEL });
    expect(screen.getByRole('tooltip')).toHaveTextContent(REBALANCING_CASH_SLEEVE_HELP_TEXT);
    expect(helpButton).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
    await user.hover(helpButton);

    await user.click(screen.getByRole('checkbox', { name: REBALANCING_CASH_SLEEVE_INCLUDE_LABEL }));
    expect(onIncludePermanentCashChange).toHaveBeenCalledWith(false);
  });
});
