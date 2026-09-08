import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchBuyTransactionsForTicker } from '../../../../../api/portfolioApi';
import type { PortfolioTransaction } from '../../../../../api/portfolioApi';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

jest.mock('../../../../../api/portfolioApi', () => ({
  fetchBuyTransactionsForTicker: jest.fn(),
}));

const buy: PortfolioTransaction = {
  id: 'b1',
  ticker: 'AAPL',
  companyName: 'Apple',
  shares: 2,
  pricePerShare: 10,
  currency: 'USD',
  transactionDate: '2026-01-02',
  transactionType: 'BUY',
  createdAt: '2026-01-02T00:00:00.000Z',
};

describe('DeleteConfirmModal', () => {
  it('returns null when closed', () => {
    const { container } = renderWithProviders(
      <DeleteConfirmModal
        isOpen={false}
        ticker="AAPL"
        onDeleteBuy={jest.fn()}
        onDeleteAll={jest.fn()}
        onSellInstead={jest.fn()}
        onClose={jest.fn()}
        isDeletingAll={false}
        buysRefreshKey={0}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists purchases and deletes one of them', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchBuyTransactionsForTicker).mockResolvedValue([buy]);
    const onDeleteBuy = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    renderWithProviders(
      <DeleteConfirmModal
        isOpen
        ticker="AAPL"
        onDeleteBuy={onDeleteBuy}
        onDeleteAll={jest.fn()}
        onSellInstead={jest.fn()}
        onClose={onClose}
        isDeletingAll={false}
        buysRefreshKey={1}
      />
    );

    expect(await screen.findByText('Purchase history')).toBeInTheDocument();
    await user.click(screen.getByTitle('Remove this purchase'));
    expect(onDeleteBuy).toHaveBeenCalledWith('b1');
    expect(onClose).toHaveBeenCalled();
  });
});
