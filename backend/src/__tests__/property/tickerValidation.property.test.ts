import fc from 'fast-check';
import { TICKER_MAX_LENGTH } from '../../constants.js';
import {
  assertValidTickerSymbol,
  isValidTickerSymbol,
  normalizeTickerSymbol,
} from '../../utils/tickerValidation.js';
import { validTickerArbitrary } from './arbitraries.js';
import { DATABASE_TICKER_PATTERN, PROPERTY_RUN_COUNT } from './propertyConstants.js';

const FORBIDDEN_CHARACTERS = ['!', '$', '/', '\\', '"', "'", '|', ';', ' ', '€', '\u0000'] as const;
const PADDING_VARIANTS = ['', ' ', '  ', '\t', '\n'] as const;
const RELAXED_INPUT_PATTERN = /^[A-Za-z0-9.=^\- ]{0,14}$/;

const assertOptions = { numRuns: PROPERTY_RUN_COUNT };

describe('ticker validation properties', () => {
  it('normalizing twice gives the same result as normalizing once', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (input) => {
        const once = normalizeTickerSymbol(input);

        expect(normalizeTickerSymbol(once)).toBe(once);
      }),
      assertOptions
    );
  });

  it('accepts every symbol built from the allowed alphabet, whatever its case or padding', () => {
    fc.assert(
      fc.property(
        validTickerArbitrary,
        fc.constantFrom(...PADDING_VARIANTS),
        fc.constantFrom(...PADDING_VARIANTS),
        (ticker, leadingPadding, trailingPadding) => {
          const messyInput = `${leadingPadding}${ticker.toLowerCase()}${trailingPadding}`;

          expect(isValidTickerSymbol(messyInput)).toBe(true);
          expect(assertValidTickerSymbol(messyInput)).toBe(ticker);
        }
      ),
      assertOptions
    );
  });

  it('only ever stores symbols the database CHECK constraint accepts', () => {
    fc.assert(
      fc.property(validTickerArbitrary, (ticker) => {
        expect(DATABASE_TICKER_PATTERN.test(assertValidTickerSymbol(ticker))).toBe(true);
      }),
      assertOptions
    );
  });

  it('agrees with the database CHECK for arbitrary and near-valid input', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ maxLength: 14 }), fc.stringMatching(RELAXED_INPUT_PATTERN)),
        (input) => {
          const normalized = normalizeTickerSymbol(input);

          expect(isValidTickerSymbol(input)).toBe(DATABASE_TICKER_PATTERN.test(normalized));
        }
      ),
      assertOptions
    );
  });

  it('rejects any symbol longer than the maximum length', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('A', 'B', 'C', '1', '.'), {
          minLength: TICKER_MAX_LENGTH + 1,
          maxLength: TICKER_MAX_LENGTH + 10,
        }),
        (characters) => {
          expect(isValidTickerSymbol(characters.join(''))).toBe(false);
        }
      ),
      assertOptions
    );
  });

  it('rejects a symbol with a forbidden character in the middle', () => {
    fc.assert(
      fc.property(
        validTickerArbitrary,
        fc.constantFrom(...FORBIDDEN_CHARACTERS),
        validTickerArbitrary,
        (left, forbidden, right) => {
          expect(isValidTickerSymbol(`${left}${forbidden}${right}`)).toBe(false);
        }
      ),
      assertOptions
    );
  });

  it('rejects empty and whitespace-only input', () => {
    fc.assert(
      fc.property(fc.constantFrom(...PADDING_VARIANTS), (padding) => {
        expect(isValidTickerSymbol(padding)).toBe(false);
        expect(() => assertValidTickerSymbol(padding)).toThrow();
      }),
      assertOptions
    );
  });
});
