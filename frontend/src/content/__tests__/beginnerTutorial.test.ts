import { BEGINNER_TUTORIAL_STEPS } from '../beginnerTutorial';
import { BEGINNER_TUTORIAL_ANCHORS, PORTFOLIO_IMPORTER_PATH, ROUTES } from '../../constants';

describe('beginnerTutorial content', () => {
  it('starts with an invite, then coaches through the live UI', () => {
    const ids = BEGINNER_TUTORIAL_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BEGINNER_TUTORIAL_STEPS[0]).toMatchObject({ id: 'invite', kind: 'invite' });
    expect(BEGINNER_TUTORIAL_STEPS.slice(1).every((step) => step.kind === 'coach')).toBe(true);
    expect(BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'importer')?.route).toBe(
      PORTFOLIO_IMPORTER_PATH
    );
    expect(BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'positions')?.route).toBe(
      ROUTES.PORTFOLIO
    );
    expect(BEGINNER_TUTORIAL_STEPS.at(-1)?.route).toContain('/MSFT');
    expect(BEGINNER_TUTORIAL_STEPS.at(-1)?.route).toContain('chat=open');
    expect(BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'dashboard')?.placementAnchorId).toBe(
      BEGINNER_TUTORIAL_ANCHORS.dashboardCard
    );
    expect(BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'importer')?.placementAnchorId).toBe(
      BEGINNER_TUTORIAL_ANCHORS.importerCard
    );
    expect(BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'importer')?.body).toContain(
      'Plus subscription'
    );
    expect(
      BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'rebalancing')?.placementAnchorId
    ).toBe(BEGINNER_TUTORIAL_ANCHORS.rebalancingCard);
    expect(BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'rebalancing')?.placement).toBe(
      'bottom-end'
    );
    expect(BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'rebalancing')?.body).not.toContain(
      'broker orders'
    );
    expect(BEGINNER_TUTORIAL_STEPS.find((step) => step.id === 'news')?.placement).toBe('bottom');
  });
});
