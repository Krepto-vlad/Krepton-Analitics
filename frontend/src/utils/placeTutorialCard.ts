import {
  APP_SHELL_HEADER_HEIGHT_PX,
  BEGINNER_TUTORIAL_CARD_WIDTH_PX,
  BEGINNER_TUTORIAL_VIEWPORT_MARGIN_PX,
  BEGINNER_TUTORIAL_CARD_GAP_PX,
  BEGINNER_TUTORIAL_MIN_TARGET_SIZE_PX,
} from '../constants';
import type { BeginnerTutorialPlacement } from '../content/beginnerTutorial';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface TutorialCardBox {
  top: number;
  left: number;
}

interface PlaceTutorialCardInput {
  target: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'> | null;
  placement: BeginnerTutorialPlacement;
  viewport: ViewportSize;
  cardWidth?: number;
  cardHeight: number;
  gap?: number;
  margin?: number;
  headerHeight?: number;
}

interface PlacementCandidate {
  placement: BeginnerTutorialPlacement;
  left: number;
  top: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function overlapArea(
  left: number,
  top: number,
  width: number,
  height: number,
  target: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom'>
): number {
  const overlapWidth = Math.max(
    0,
    Math.min(left + width, target.right) - Math.max(left, target.left)
  );
  const overlapHeight = Math.max(
    0,
    Math.min(top + height, target.bottom) - Math.max(top, target.top)
  );
  return overlapWidth * overlapHeight;
}

export function placeTutorialCard({
  target,
  placement,
  viewport,
  cardWidth = BEGINNER_TUTORIAL_CARD_WIDTH_PX,
  cardHeight,
  gap = BEGINNER_TUTORIAL_CARD_GAP_PX,
  margin = BEGINNER_TUTORIAL_VIEWPORT_MARGIN_PX,
  headerHeight = APP_SHELL_HEADER_HEIGHT_PX,
}: PlaceTutorialCardInput): TutorialCardBox {
  const topMargin = margin + headerHeight;
  const maxLeft = Math.max(margin, viewport.width - cardWidth - margin);
  const maxTop = Math.max(topMargin, viewport.height - cardHeight - margin);

  if (!target || placement === 'center') {
    return {
      left: clamp((viewport.width - cardWidth) / 2, margin, maxLeft),
      top: clamp((viewport.height - cardHeight) / 2, topMargin, maxTop),
    };
  }

  const candidates: PlacementCandidate[] = [
    { placement: 'right', left: target.right + gap, top: target.top },
    { placement: 'left', left: target.left - gap - cardWidth, top: target.top },
    { placement: 'bottom', left: target.left, top: target.bottom + gap },
    { placement: 'bottom-end', left: target.right - cardWidth, top: target.bottom + gap },
    { placement: 'top', left: target.left, top: target.top - gap - cardHeight },
  ];

  const preferred = candidates.find((candidate) => candidate.placement === placement);
  const ordered = preferred
    ? [preferred, ...candidates.filter((candidate) => candidate.placement !== placement)]
    : candidates;

  const scored = ordered.map((candidate) => {
    const left = clamp(candidate.left, margin, maxLeft);
    const top = clamp(candidate.top, topMargin, maxTop);
    const overlap = overlapArea(left, top, cardWidth, cardHeight, target);
    const targetTopBand = {
      top: target.top,
      left: target.left,
      right: target.right,
      bottom: target.top + target.height * 0.4,
    };
    const topBandOverlap = overlapArea(left, top, cardWidth, cardHeight, targetTopBand);
    const fitsUnclamped =
      candidate.left >= margin &&
      candidate.top >= topMargin &&
      candidate.left + cardWidth <= viewport.width - margin &&
      candidate.top + cardHeight <= viewport.height - margin;

    return {
      left,
      top,
      overlap,
      topBandOverlap,
      fitsUnclamped,
      isPreferred: candidate.placement === placement,
    };
  });

  scored.sort((left, right) => {
    if (left.fitsUnclamped !== right.fitsUnclamped) {
      return left.fitsUnclamped ? -1 : 1;
    }
    if (left.topBandOverlap !== right.topBandOverlap) {
      return left.topBandOverlap - right.topBandOverlap;
    }
    if (left.overlap !== right.overlap) {
      return left.overlap - right.overlap;
    }
    if (left.isPreferred !== right.isPreferred) {
      return left.isPreferred ? -1 : 1;
    }
    return 0;
  });

  const chosen = scored[0];

  return {
    left: chosen.left,
    top: chosen.top,
  };
}

export interface TutorialHighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
  clipPath: string;
}

export interface TutorialClipBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export function clipTutorialHighlight(
  target: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>,
  clipBounds: TutorialClipBounds,
  padding = 0
): TutorialHighlightBox | null {
  const boxTop = target.top - padding;
  const boxLeft = target.left - padding;
  const boxRight = target.right + padding;
  const boxBottom = target.bottom + padding;
  const visibleLeft = Math.max(boxLeft, clipBounds.left);
  const visibleTop = Math.max(boxTop, clipBounds.top);
  const visibleRight = Math.min(boxRight, clipBounds.right);
  const visibleBottom = Math.min(boxBottom, clipBounds.bottom);

  if (
    visibleRight - visibleLeft < BEGINNER_TUTORIAL_MIN_TARGET_SIZE_PX ||
    visibleBottom - visibleTop < BEGINNER_TUTORIAL_MIN_TARGET_SIZE_PX
  ) {
    return null;
  }

  const insetTop = Math.max(0, clipBounds.top - boxTop);
  const insetRight = Math.max(0, boxRight - clipBounds.right);
  const insetBottom = Math.max(0, boxBottom - clipBounds.bottom);
  const insetLeft = Math.max(0, clipBounds.left - boxLeft);

  return {
    top: boxTop,
    left: boxLeft,
    width: boxRight - boxLeft,
    height: boxBottom - boxTop,
    clipPath: `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`,
  };
}
