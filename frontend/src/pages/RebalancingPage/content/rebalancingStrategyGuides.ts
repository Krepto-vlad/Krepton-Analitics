import type {
  RebalancingPrebuiltStrategyId,
  RebalancingStrategyId,
} from '../../../types/rebalancing.types';

export interface StrategyGuideSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface StrategyGuide {
  title: string;
  attribution: string;
  sections: readonly StrategyGuideSection[];
  sourceLabel: string | null;
  sourceUrl: string | null;
}

const BUFFETT_LETTER_URL = 'https://www.berkshirehathaway.com/letters/2013ltr.pdf';
const ALL_WEATHER_STORY_URL =
  'https://www.bridgewater.com/research-and-insights/the-all-weather-story';
const THREE_FUND_URL = 'https://www.bogleheads.org/wiki/Three-fund_portfolio';
const PERMANENT_PORTFOLIO_URL = 'https://www.bogleheads.org/wiki/Permanent_portfolio';

const PREBUILT_GUIDES: Record<RebalancingPrebuiltStrategyId, StrategyGuide> = {
  'warren-buffett-9010': {
    title: 'Warren Buffett 90/10',
    attribution:
      'Warren Buffett described this split in his 2013 letter to Berkshire Hathaway shareholders. He was writing instructions for a trustee, not launching a fund.',
    sections: [
      {
        heading: 'What he actually said',
        paragraphs: [
          'Buffett told the trustees who would one day invest money for his wife to keep the plan very simple. Put 10% in short-term government bonds and 90% in a very low-cost S&P 500 index fund. He expected that mix to beat most people who try to pick individual businesses, including highly paid managers, because costs stay low and the money stays in productive companies.',
          'The letter is personal advice for one heir who would not be watching markets. It is not a claim that 90/10 is the right split for every person, every age, or every year.',
        ],
      },
      {
        heading: 'What the two sleeves are saying',
        paragraphs: [
          'The 90% sleeve is the broad market of large American companies, owned through an index rather than through a handful of favorite stocks. The idea is to stay invested in businesses for decades and let compounding do the work, instead of moving in and out based on headlines.',
          'The 10% sleeve is short-term Treasuries: government paper that behaves more like a cash reserve than like a long bond. Its job is practical. If stocks fall hard, living expenses can come from this sleeve, so the stock holding does not have to be sold at the worst moment. The split is saying “stay almost fully in businesses, and keep a small reserve,” not “stocks will rise next quarter.”',
        ],
      },
      {
        heading: 'How this page uses it',
        paragraphs: [
          'This page groups holdings into large-cap equities and short-term treasuries so you can see how far a portfolio sits from that 90/10 shape. The shape stays Buffett’s. If you move the sliders, you are no longer looking at his instruction. You are looking at your own target.',
        ],
      },
    ],
    sourceLabel: 'Berkshire Hathaway 2013 shareholder letter',
    sourceUrl: BUFFETT_LETTER_URL,
  },
  'ray-dalio-all-weather': {
    title: 'Ray Dalio All-Weather',
    attribution:
      'The idea comes from Ray Dalio and Bridgewater’s All Weather research. The 30/40/15/7.5/7.5 weights on this page are the simplified mix Dalio has described in public, often called All Seasons. They are not the live weights of Bridgewater’s All Weather fund.',
    sections: [
      {
        heading: 'The problem the mix is trying to solve',
        paragraphs: [
          'Most portfolios are a bet that the economy will keep growing and that inflation will stay calm, because that is when stocks do well. Dalio’s public explanation starts from the opposite assumption: you do not know which economy comes next, so a portfolio that only works in one kind of year will eventually hurt.',
          'He sorts the economy into four environments. Growth can be rising or falling, and inflation can be rising or falling. Different assets tend to help in different boxes. The mix is an attempt to own something for each box, so the portfolio is not a single forecast.',
        ],
      },
      {
        heading: 'What each sleeve is there for',
        paragraphs: [
          'Large-cap stocks are the growth sleeve. They are the smaller share of the money on purpose, because stocks move more than bonds. Long-term bonds are there for falling inflation and weak growth: when the economy cools and rates fall, longer bonds have historically risen. Intermediate bonds are a milder version of that same role, with less interest-rate swing.',
          'Gold and commodities are the inflation sleeves. They are not there to “beat stocks.” They are there so a year of rising prices is not carried only by the stock and bond holdings. The large bond share looks odd next to a 60/40 portfolio. It follows from the idea that a calmer asset needs more money if each sleeve is meant to matter about as much when its environment arrives.',
        ],
      },
      {
        heading: 'What these percentages are not',
        paragraphs: [
          'Bridgewater’s institutional All Weather approach is risk parity. The fund rebalances risk, and it does not publish this 30/40/15/7.5/7.5 recipe as its holdings. The numbers on this page are the simplified public illustration. Use them as a way to understand the seasons idea and to compare a portfolio with that illustration, not as a copy of the Bridgewater fund.',
        ],
      },
    ],
    sourceLabel: 'Bridgewater, The All Weather Story',
    sourceUrl: ALL_WEATHER_STORY_URL,
  },
  'bogleheads-three-fund': {
    title: 'Bogleheads three-fund',
    attribution:
      'The three-fund portfolio is the Bogleheads community’s plain version of John Bogle’s case for broad, cheap index funds. Bogle founded Vanguard and argued for owning the market instead of picking winners.',
    sections: [
      {
        heading: 'What the idea is saying',
        paragraphs: [
          'A three-fund portfolio owns the stock market, owns bonds, and refuses to pick individual companies. One fund covers a wide set of stocks at home, one covers stocks abroad, and one covers high-quality bonds. The investor chooses the stock-versus-bond split for their own time horizon, then leaves the funds alone except to rebalance back to that split.',
          'The argument is about costs and behavior. A cheap index keeps the market’s return instead of giving a slice of it to trading and fees. A written split makes it harder to abandon the plan after a bad headline, because the next action is already decided: move back toward the same three funds.',
        ],
      },
      {
        heading: 'How this page’s numbers differ',
        paragraphs: [
          'The classic write-up is a total US stock fund, a total international stock fund, and a total bond market fund. Emerging markets sit inside the international fund. There is no required percentage. People pick their own stock and bond shares.',
          'The numbers on this page are one teaching illustration: 60% in a US or world stock index, 20% in emerging markets, and 20% in investment-grade bonds. That separate emerging-markets sleeve is not a rule from the Bogleheads page. If you change the sliders, you are writing your own three-way split.',
        ],
      },
    ],
    sourceLabel: 'Bogleheads wiki, Three-fund portfolio',
    sourceUrl: THREE_FUND_URL,
  },
  'harry-browne-permanent': {
    title: 'Harry Browne Permanent Portfolio',
    attribution:
      'Harry Browne set this out in Fail-Safe Investing. The rule is four equal parts, and the point of the equal parts is that you refuse to guess which economy is next.',
    sections: [
      {
        heading: 'Four economies, four holdings',
        paragraphs: [
          'Browne named four conditions and one holding for each. Stocks for prosperity, when businesses are growing. Long-term bonds for deflation, when prices and rates fall and a long bond’s fixed payments become more valuable. Gold for inflation, when cash and ordinary bonds lose purchasing power. Cash, meaning Treasury bills, for a tight recession, when you want something that does not have to be sold in a panic.',
          'Nothing in the mix is a small hedge. Each sleeve is 25%, so the asset that is having its year is large enough to matter. Browne’s claim was not that every sleeve rises every year. It was that the one matching the current economy can offset the ones that do not.',
        ],
      },
      {
        heading: 'Why he wanted it left alone',
        paragraphs: [
          'The portfolio is “permanent” because the recipe does not change when the news changes. You do not sell the gold because inflation looks quiet, and you do not drop the cash because stocks look strong. Once a year, or when a sleeve has drifted far from 25%, you move money back to equal weight. That rebalance is the whole active decision.',
          'Browne wrote this for someone who wanted to protect purchasing power without forecasting. It is a defensive arrangement. A long bull market in stocks will leave it behind a stock-heavy portfolio, and that lag is the cost of holding the other three seasons in size.',
        ],
      },
    ],
    sourceLabel: 'Harry Browne, Fail-Safe Investing, as summarized by the Bogleheads wiki',
    sourceUrl: PERMANENT_PORTFOLIO_URL,
  },
};

export function resolveStrategyGuide(
  strategyId: RebalancingStrategyId,
  baseStrategyName: string | null
): StrategyGuide {
  if (strategyId !== 'custom') {
    return PREBUILT_GUIDES[strategyId];
  }

  const basedOn = baseStrategyName
    ? `The weights started from ${baseStrategyName}. That named model is still its author’s. The numbers you saved are a separate target.`
    : 'These weights were not copied from a named publication.';

  return {
    title: 'Your custom target',
    attribution:
      'This is not a published strategy. Nobody outside your account wrote these weights, and Krepton is not offering them as a model to follow.',
    sections: [
      {
        heading: 'What you are looking at',
        paragraphs: [
          'A custom target is the set of percentages you chose on this page. The app compares your holdings with those percentages and shows which sleeves are above or below them. It does not mean the mix has a track record, an author, or a reason beyond the one you had when you moved the sliders.',
          basedOn,
        ],
      },
      {
        heading: 'How to read a named model instead',
        paragraphs: [
          'The other tabs on this screen are published mixes. Each one explains what its author was trying to do, and where the original text lives. Switching tabs only changes what you are reading. It does not replace the target saved on your account.',
        ],
      },
    ],
    sourceLabel: null,
    sourceUrl: null,
  };
}
