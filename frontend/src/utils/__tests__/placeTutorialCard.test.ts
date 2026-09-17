import { APP_SHELL_HEADER_HEIGHT_PX } from '../../constants';
import { clipTutorialHighlight, placeTutorialCard } from '../placeTutorialCard';

const VIEWPORT = { width: 1280, height: 800 };
const TARGET = { top: 80, left: 80, right: 480, bottom: 280, width: 400, height: 200 };

describe('placeTutorialCard', () => {
  it('centers the invite card in the viewport below the app header', () => {
    const box = placeTutorialCard({
      target: null,
      placement: 'center',
      viewport: VIEWPORT,
      cardHeight: 200,
      cardWidth: 320,
    });

    expect(box.left).toBe((VIEWPORT.width - 320) / 2);
    expect(box.top).toBe((VIEWPORT.height - 200) / 2);
    expect(box.top).toBeGreaterThanOrEqual(APP_SHELL_HEADER_HEIGHT_PX);
  });

  it('puts a right placement beside the target without leaving the viewport', () => {
    const box = placeTutorialCard({
      target: TARGET,
      placement: 'right',
      viewport: VIEWPORT,
      cardHeight: 180,
      cardWidth: 320,
      gap: 16,
    });

    expect(box.left).toBe(TARGET.right + 16);
    expect(box.top).toBe(TARGET.top);
  });

  it('flips to a side that fits when the preferred side overflows', () => {
    const box = placeTutorialCard({
      target: { top: 80, left: 1000, right: 1260, bottom: 200, width: 260, height: 120 },
      placement: 'right',
      viewport: VIEWPORT,
      cardHeight: 180,
      cardWidth: 320,
      gap: 16,
      margin: 12,
    });

    expect(box.left + 320).toBeLessThanOrEqual(VIEWPORT.width - 12);
    expect(box.left).toBeGreaterThanOrEqual(12);
  });

  it('avoids covering the top of a full-width target', () => {
    const wideTarget = {
      top: 72,
      left: 64,
      right: 1240,
      bottom: 520,
      width: 1176,
      height: 448,
    };
    const box = placeTutorialCard({
      target: wideTarget,
      placement: 'bottom',
      viewport: VIEWPORT,
      cardHeight: 180,
      cardWidth: 320,
      gap: 16,
    });

    expect(box.top).toBeGreaterThanOrEqual(wideTarget.top + wideTarget.height * 0.4);
  });

  it('aligns a bottom-end card to the right of the target', () => {
    const box = placeTutorialCard({
      target: TARGET,
      placement: 'bottom-end',
      viewport: VIEWPORT,
      cardHeight: 180,
      cardWidth: 320,
      gap: 16,
    });

    expect(box.left).toBe(TARGET.right - 320);
    expect(box.top).toBe(TARGET.bottom + 16);
  });

  it('keeps the highlight box on the target and clips overflow with clip-path', () => {
    const box = clipTutorialHighlight(
      { top: -200, left: 80, right: 1200, bottom: 1800, width: 1120, height: 2000 },
      { top: 60, left: 64, right: 1280, bottom: 800 }
    );

    expect(box).not.toBeNull();
    expect(box?.top).toBe(-200);
    expect(box?.left).toBe(80);
    expect(box?.height).toBe(2000);
    expect(box?.clipPath).toBe('inset(260px 0px 1000px 0px)');
  });
});
