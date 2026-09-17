import {
  BEGINNER_TUTORIAL_ANCHORS,
  PORTFOLIO_IMPORTER_PATH,
  ROUTES,
  buildBeginnerTutorialTickerPath,
} from '../constants';

export const BEGINNER_TUTORIAL_PLACEMENTS = [
  'center',
  'right',
  'left',
  'bottom',
  'bottom-end',
  'top',
] as const;
export type BeginnerTutorialPlacement = (typeof BEGINNER_TUTORIAL_PLACEMENTS)[number];
export type BeginnerTutorialKind = 'invite' | 'coach';

export interface BeginnerTutorialStep {
  id: string;
  kind: BeginnerTutorialKind;
  title: string;
  body: string;
  route: string;
  anchorId: string | null;
  placementAnchorId?: string;
  placement: BeginnerTutorialPlacement;
  lockSidebarExpanded: boolean;
}

export const BEGINNER_TUTORIAL_STEPS: BeginnerTutorialStep[] = [
  {
    id: 'invite',
    kind: 'invite',
    title: 'Take a quick tour?',
    body: 'A short walk through Dashboard, the sidebar, Portfolio, Rebalancing, News, and ticker chat. Skip if you already know the app — you can replay this from Profile.',
    route: ROUTES.DASHBOARD,
    anchorId: null,
    placement: 'center',
    lockSidebarExpanded: false,
  },
  {
    id: 'dashboard',
    kind: 'coach',
    title: 'This is your dashboard',
    body: 'Health versus your strategy, equity, positions, watchlist, and headlines live here.',
    route: ROUTES.DASHBOARD,
    anchorId: BEGINNER_TUTORIAL_ANCHORS.dashboard,
    placementAnchorId: BEGINNER_TUTORIAL_ANCHORS.dashboardCard,
    placement: 'bottom',
    lockSidebarExpanded: false,
  },
  {
    id: 'sidebar',
    kind: 'coach',
    title: 'Main tools are on the left',
    body: 'The sidebar holds Dashboard, Portfolio, News, Rebalancing, and research tools. Hover it to read the labels.',
    route: ROUTES.DASHBOARD,
    anchorId: BEGINNER_TUTORIAL_ANCHORS.sidebar,
    placement: 'right',
    lockSidebarExpanded: true,
  },
  {
    id: 'importer',
    kind: 'coach',
    title: 'Add holdings here',
    body: 'Import a broker CSV/XLSX, add a position by hand, or connect your broker account with our Plus subscription.',
    route: PORTFOLIO_IMPORTER_PATH,
    anchorId: BEGINNER_TUTORIAL_ANCHORS.importer,
    placementAnchorId: BEGINNER_TUTORIAL_ANCHORS.importerCard,
    placement: 'bottom',
    lockSidebarExpanded: false,
  },
  {
    id: 'positions',
    kind: 'coach',
    title: 'Your positions',
    body: 'This tab lists every holding: ticker, size, and P/L. Open a row to jump into that stock.',
    route: ROUTES.PORTFOLIO,
    anchorId: BEGINNER_TUTORIAL_ANCHORS.positions,
    placement: 'right',
    lockSidebarExpanded: false,
  },
  {
    id: 'rebalancing',
    kind: 'coach',
    title: 'Strategy and AI explanation',
    body: 'Pick or tune a target mix on Technical Rebalancing. Open AI Insights on this page for an explanation of how your portfolio lines up.',
    route: ROUTES.REBALANCING,
    anchorId: BEGINNER_TUTORIAL_ANCHORS.rebalancing,
    placementAnchorId: BEGINNER_TUTORIAL_ANCHORS.rebalancingCard,
    placement: 'bottom-end',
    lockSidebarExpanded: false,
  },
  {
    id: 'news',
    kind: 'coach',
    title: 'News and AI summary',
    body: 'Headlines for tickers you hold, plus an optional AI briefing. Output is educational — verify figures before you act.',
    route: ROUTES.NEWS,
    anchorId: BEGINNER_TUTORIAL_ANCHORS.news,
    placement: 'bottom',
    lockSidebarExpanded: false,
  },
  {
    id: 'tickerChat',
    kind: 'coach',
    title: 'Stats and ticker chat',
    body: 'Look at statistics for a specific stock, then ask anything in the AI chat. Answers stay on this ticker — not general investment advice.',
    route: buildBeginnerTutorialTickerPath(),
    anchorId: BEGINNER_TUTORIAL_ANCHORS.tickerChat,
    placement: 'left',
    lockSidebarExpanded: false,
  },
];

export const BEGINNER_TUTORIAL_TITLE_ID = 'beginner-tutorial-title';
export const BEGINNER_TUTORIAL_DIALOG_LABEL = 'Beginner tutorial';
export const BEGINNER_TUTORIAL_SKIP_LABEL = 'Skip';
export const BEGINNER_TUTORIAL_START_LABEL = 'Start tour';
export const BEGINNER_TUTORIAL_BACK_LABEL = 'Back';
export const BEGINNER_TUTORIAL_NEXT_LABEL = 'Next';
export const BEGINNER_TUTORIAL_DONE_LABEL = 'Done';
export const BEGINNER_TUTORIAL_CLOSE_LABEL = 'Close';
export const BEGINNER_TUTORIAL_REPLAY_LABEL = 'Replay beginner tutorial';
export const BEGINNER_TUTORIAL_PROGRESS_LABEL = 'Tutorial step';
export const BEGINNER_TUTORIAL_INVITE_STEP_INDEX = 0;
export const BEGINNER_TUTORIAL_FIRST_COACH_STEP_INDEX = 1;
