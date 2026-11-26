import { act, fireEvent, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders } from '../../__tests__/renderWithProviders';
import {
  DASHBOARD_CARD_MOBILE_VIEWPORT_QUERY,
  DASHBOARD_CARD_NAVIGATION_DELAY_MS,
  DASHBOARD_CARD_NAVIGATION_IGNORE_ATTRIBUTE,
  DASHBOARD_ROW_NAVIGATION_ATTRIBUTE,
} from '../../constants';
import { useCardNavigation } from '../useCardNavigation';

const DESTINATION = '/destination';
const ROW_DESTINATION = '/row-destination';
const DOUBLE_CLICK_DETAIL = 2;

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function Card({ destination }: { destination: string | null }) {
  const handleClick = useCardNavigation(destination);
  return (
    <div data-testid="card" onClick={handleClick}>
      <p>Card text</p>
      <div {...{ [DASHBOARD_ROW_NAVIGATION_ATTRIBUTE]: ROW_DESTINATION }}>Row text</div>
      <button type="button">Inner button</button>
      <div {...{ [DASHBOARD_CARD_NAVIGATION_IGNORE_ATTRIBUTE]: '' }}>Chart area</div>
    </div>
  );
}

function renderCard(destination: string | null) {
  renderWithProviders(
    <>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<Card destination={destination} />} />
        <Route path={DESTINATION} element={<p>Destination page</p>} />
        <Route path={ROW_DESTINATION} element={<p>Row page</p>} />
      </Routes>
    </>
  );
}

function waitForNavigationDelay() {
  act(() => {
    jest.advanceTimersByTime(DASHBOARD_CARD_NAVIGATION_DELAY_MS);
  });
}

describe('useCardNavigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    Reflect.deleteProperty(window, 'matchMedia');
    window.getSelection()?.removeAllRanges();
  });

  it('opens the destination after a plain click on the card text', () => {
    renderCard(DESTINATION);

    fireEvent.click(screen.getByText('Card text'), { detail: 1 });
    expect(screen.getByTestId('location')).toHaveTextContent('/');
    waitForNavigationDelay();

    expect(screen.getByTestId('location')).toHaveTextContent(DESTINATION);
  });

  it('does not navigate when navigation is switched off', () => {
    renderCard(null);

    fireEvent.click(screen.getByText('Card text'), { detail: 1 });
    waitForNavigationDelay();

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('leaves buttons and marked areas such as charts alone', () => {
    renderCard(DESTINATION);

    fireEvent.click(screen.getByRole('button', { name: 'Inner button' }), { detail: 1 });
    fireEvent.click(screen.getByText('Chart area'), { detail: 1 });
    waitForNavigationDelay();

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('does not navigate when the click ends a text selection', () => {
    renderCard(DESTINATION);
    const textNode = screen.getByText('Card text').firstChild as Text;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    window.getSelection()?.addRange(range);

    fireEvent.click(screen.getByText('Card text'), { detail: 1 });
    waitForNavigationDelay();

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('does not navigate on a double click used to select a word', () => {
    renderCard(DESTINATION);
    const text = screen.getByText('Card text');

    fireEvent.click(text, { detail: 1 });
    fireEvent.click(text, { detail: DOUBLE_CLICK_DETAIL });
    waitForNavigationDelay();

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('opens the row path instead of the card path when a marked row is clicked', () => {
    renderCard(DESTINATION);

    fireEvent.click(screen.getByText('Row text'), { detail: 1 });
    waitForNavigationDelay();

    expect(screen.getByTestId('location')).toHaveTextContent(ROW_DESTINATION);
  });

  it('does nothing on phone-sized viewports, where only the corner link navigates', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === DASHBOARD_CARD_MOBILE_VIEWPORT_QUERY,
    })) as unknown as typeof window.matchMedia;
    renderCard(DESTINATION);

    fireEvent.click(screen.getByText('Card text'), { detail: 1 });
    fireEvent.click(screen.getByText('Row text'), { detail: 1 });
    waitForNavigationDelay();

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
