import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { prefetchBeginnerTutorialTicker } from '../../utils/prefetchBeginnerTutorialTicker';
import {
  APP_SHELL_BOTTOM_INSET_VARIABLE,
  APP_SHELL_ELEMENT_ATTRIBUTE,
  APP_SHELL_HEADER_HEIGHT_PX,
  APP_SHELL_HEADER_HEIGHT_VARIABLE,
  BEGINNER_TUTORIAL_ANCHOR_ATTRIBUTE,
  BEGINNER_TUTORIAL_ANCHOR_RETRY_DURATION_MS,
  BEGINNER_TUTORIAL_ANCHOR_RETRY_INTERVAL_MS,
  BEGINNER_TUTORIAL_CARD_ESTIMATED_HEIGHT_PX,
  BEGINNER_TUTORIAL_CARD_WIDTH_PX,
  BEGINNER_TUTORIAL_CLIP_ATTRIBUTE,
  BEGINNER_TUTORIAL_HIGHLIGHT_PADDING_PX,
  BEGINNER_TUTORIAL_LAYOUT_TRANSITION_PROPERTIES,
  BEGINNER_TUTORIAL_MIN_TARGET_SIZE_PX,
  BEGINNER_TUTORIAL_VIEWPORT_MARGIN_PX,
} from '../../constants';
import { BEGINNER_TUTORIAL_STEPS } from '../../content/beginnerTutorial';
import { placeTutorialCard, clipTutorialHighlight } from '../../utils/placeTutorialCard';
import { useBeginnerTutorial } from './BeginnerTutorialContext';
import { BeginnerTutorialCard } from './BeginnerTutorialCard';
import styles from './BeginnerTutorialCard.module.scss';

interface TutorialClipRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialLayout {
  top: number;
  left: number;
  clip: TutorialClipRect;
  highlight: {
    top: number;
    left: number;
    width: number;
    height: number;
    clipPath: string;
  } | null;
}

function isTutorialLayoutTransition(propertyName: string): boolean {
  return (BEGINNER_TUTORIAL_LAYOUT_TRANSITION_PROPERTIES as readonly string[]).includes(
    propertyName
  );
}

function isTutorialRouteActive(route: string, pathname: string, search: string): boolean {
  if (route.includes('?')) {
    return `${pathname}${search}` === route;
  }

  return pathname === route && (search === '' || search === '?');
}

function readShellCssPx(variableName: string, fallbackPx: number): number {
  const shell = document.querySelector(`[${APP_SHELL_ELEMENT_ATTRIBUTE}]`);
  if (!(shell instanceof HTMLElement)) {
    return fallbackPx;
  }

  const parsed = Number.parseFloat(getComputedStyle(shell).getPropertyValue(variableName));
  return Number.isFinite(parsed) ? parsed : fallbackPx;
}

function readClipBounds(
  viewport: { width: number; height: number },
  headerHeightPx: number
): {
  top: number;
  left: number;
  right: number;
  bottom: number;
} {
  const clipNode = document.querySelector(`[${BEGINNER_TUTORIAL_CLIP_ATTRIBUTE}]`);
  const clipRect = clipNode?.getBoundingClientRect();
  if (!clipRect) {
    return {
      top: headerHeightPx,
      left: 0,
      right: viewport.width,
      bottom: viewport.height,
    };
  }

  return {
    top: Math.max(clipRect.top, headerHeightPx),
    left: clipRect.left,
    right: clipRect.right,
    bottom: Math.min(clipRect.bottom, viewport.height),
  };
}

function readAnchorNode(anchorId: string | null): Element | null {
  if (!anchorId) {
    return null;
  }

  return document.querySelector(`[${BEGINNER_TUTORIAL_ANCHOR_ATTRIBUTE}="${anchorId}"]`);
}

function readAnchorRect(anchorId: string | null): DOMRect | null {
  const target = readAnchorNode(anchorId)?.getBoundingClientRect() ?? null;
  if (!target) {
    return null;
  }

  if (
    target.width < BEGINNER_TUTORIAL_MIN_TARGET_SIZE_PX ||
    target.height < BEGINNER_TUTORIAL_MIN_TARGET_SIZE_PX
  ) {
    return null;
  }

  return target;
}

function toClipRect(bounds: {
  top: number;
  left: number;
  right: number;
  bottom: number;
}): TutorialClipRect {
  return {
    top: bounds.top,
    left: bounds.left,
    width: Math.max(0, bounds.right - bounds.left),
    height: Math.max(0, bounds.bottom - bounds.top),
  };
}

function areLayoutsEqual(left: TutorialLayout, right: TutorialLayout): boolean {
  if (
    left.top !== right.top ||
    left.left !== right.left ||
    left.clip.top !== right.clip.top ||
    left.clip.left !== right.clip.left ||
    left.clip.width !== right.clip.width ||
    left.clip.height !== right.clip.height
  ) {
    return false;
  }

  if (left.highlight === null || right.highlight === null) {
    return left.highlight === right.highlight;
  }

  return (
    left.highlight.top === right.highlight.top &&
    left.highlight.left === right.highlight.left &&
    left.highlight.width === right.highlight.width &&
    left.highlight.height === right.highlight.height &&
    left.highlight.clipPath === right.highlight.clipPath
  );
}

export function BeginnerTutorialHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const displayCurrency = useAppSelector((state) => state.ui.currency);
  const { isOpen, stepIndex, currentStep, setStepIndex, startTour, completeAndClose } =
    useBeginnerTutorial();
  const cardRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<TutorialLayout>({
    top: 96,
    left: 96,
    clip: { top: 0, left: 0, width: 0, height: 0 },
    highlight: null,
  });

  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.kind === 'invite') {
      return;
    }

    if (isTutorialRouteActive(currentStep.route, location.pathname, location.search)) {
      return;
    }

    navigate(currentStep.route);
  }, [isOpen, currentStep, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    prefetchBeginnerTutorialTicker(dispatch, displayCurrency);
  }, [dispatch, displayCurrency, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !currentStep) {
      return;
    }

    let frameId = 0;
    let layoutTransitionFrameId = 0;
    let activeLayoutTransitions = 0;
    let observedHighlightNode: Element | null = null;
    let observedPlacementNode: Element | null = null;
    let observedClipNode: Element | null = null;
    const retryStartedAt = Date.now();
    const resizeObserver = new ResizeObserver(() => {
      scheduleUpdate();
    });

    function syncObservedNodes(highlightNode: Element | null, placementNode: Element | null): void {
      const nextNodes = new Set(
        [highlightNode, placementNode].filter((node): node is Element => node !== null)
      );
      const previousNodes = new Set(
        [observedHighlightNode, observedPlacementNode].filter(
          (node): node is Element => node !== null
        )
      );

      previousNodes.forEach((node) => {
        if (!nextNodes.has(node)) {
          resizeObserver.unobserve(node);
        }
      });
      nextNodes.forEach((node) => {
        if (!previousNodes.has(node)) {
          resizeObserver.observe(node);
        }
      });

      observedHighlightNode = highlightNode;
      observedPlacementNode = placementNode;
    }

    function updatePosition(): void {
      const headerHeightPx = readShellCssPx(
        APP_SHELL_HEADER_HEIGHT_VARIABLE,
        APP_SHELL_HEADER_HEIGHT_PX
      );
      const bottomInsetPx = readShellCssPx(APP_SHELL_BOTTOM_INSET_VARIABLE, 0);
      const viewport = {
        width: window.innerWidth,
        height: Math.max(0, window.innerHeight - bottomInsetPx),
      };
      const highlightNode = readAnchorNode(currentStep?.anchorId ?? null);
      const placementNode = readAnchorNode(
        currentStep?.placementAnchorId ?? currentStep?.anchorId ?? null
      );
      const highlightTarget = readAnchorRect(currentStep?.anchorId ?? null);
      const placementTarget = readAnchorRect(
        currentStep?.placementAnchorId ?? currentStep?.anchorId ?? null
      );
      const cardHeight =
        cardRef.current?.offsetHeight ?? BEGINNER_TUTORIAL_CARD_ESTIMATED_HEIGHT_PX;
      const nextPosition = placeTutorialCard({
        target: placementTarget,
        placement: currentStep?.placement ?? 'center',
        viewport,
        cardWidth: Math.min(
          BEGINNER_TUTORIAL_CARD_WIDTH_PX,
          viewport.width - BEGINNER_TUTORIAL_VIEWPORT_MARGIN_PX * 2
        ),
        cardHeight,
        headerHeight: headerHeightPx,
      });

      const clipNode = document.querySelector(`[${BEGINNER_TUTORIAL_CLIP_ATTRIBUTE}]`);
      const clipBounds = readClipBounds(viewport, headerHeightPx);
      syncObservedNodes(highlightNode, placementNode);
      if (clipNode !== observedClipNode) {
        if (observedClipNode) {
          resizeObserver.unobserve(observedClipNode);
        }
        if (clipNode) {
          resizeObserver.observe(clipNode);
        }
        observedClipNode = clipNode;
      }

      const nextLayout: TutorialLayout = {
        top: nextPosition.top,
        left: nextPosition.left,
        clip: toClipRect(clipBounds),
        highlight: highlightTarget
          ? clipTutorialHighlight(
              highlightTarget,
              clipBounds,
              BEGINNER_TUTORIAL_HIGHLIGHT_PADDING_PX
            )
          : null,
      };

      setLayout((current) => (areLayoutsEqual(current, nextLayout) ? current : nextLayout));
    }

    function scheduleUpdate(): void {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updatePosition);
    }

    function tickLayoutTransition(): void {
      updatePosition();
      if (activeLayoutTransitions > 0) {
        layoutTransitionFrameId = requestAnimationFrame(tickLayoutTransition);
      }
    }

    function handleLayoutTransitionRun(event: TransitionEvent): void {
      if (!isTutorialLayoutTransition(event.propertyName)) {
        return;
      }

      activeLayoutTransitions += 1;
      if (activeLayoutTransitions === 1) {
        cancelAnimationFrame(layoutTransitionFrameId);
        layoutTransitionFrameId = requestAnimationFrame(tickLayoutTransition);
      }
    }

    function handleLayoutTransitionStop(event: TransitionEvent): void {
      if (!isTutorialLayoutTransition(event.propertyName)) {
        return;
      }

      activeLayoutTransitions = Math.max(0, activeLayoutTransitions - 1);
      if (activeLayoutTransitions === 0) {
        cancelAnimationFrame(layoutTransitionFrameId);
      }
      scheduleUpdate();
    }

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    document.addEventListener('scroll', scheduleUpdate, true);
    document.addEventListener('transitionrun', handleLayoutTransitionRun, true);
    document.addEventListener('transitionend', handleLayoutTransitionStop, true);
    document.addEventListener('transitioncancel', handleLayoutTransitionStop, true);

    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    const retryTimer = window.setInterval(() => {
      if (Date.now() - retryStartedAt >= BEGINNER_TUTORIAL_ANCHOR_RETRY_DURATION_MS) {
        window.clearInterval(retryTimer);
        return;
      }
      scheduleUpdate();
    }, BEGINNER_TUTORIAL_ANCHOR_RETRY_INTERVAL_MS);

    return () => {
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(layoutTransitionFrameId);
      window.clearInterval(retryTimer);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      document.removeEventListener('scroll', scheduleUpdate, true);
      document.removeEventListener('transitionrun', handleLayoutTransitionRun, true);
      document.removeEventListener('transitionend', handleLayoutTransitionStop, true);
      document.removeEventListener('transitioncancel', handleLayoutTransitionStop, true);
    };
  }, [isOpen, currentStep, location.pathname, location.search, stepIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        completeAndClose();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, completeAndClose]);

  if (!isOpen || !currentStep) {
    return null;
  }

  function handleNext(): void {
    if (stepIndex >= BEGINNER_TUTORIAL_STEPS.length - 1) {
      completeAndClose();
      return;
    }
    setStepIndex(stepIndex + 1);
  }

  function handleBack(): void {
    if (stepIndex <= 0) {
      return;
    }
    setStepIndex(stepIndex - 1);
  }

  return (
    <>
      {currentStep.kind === 'invite' && <div className={styles.inviteScrim} />}
      {layout.highlight && currentStep.kind === 'coach' && (
        <div
          className={styles.highlightClip}
          style={{
            top: layout.clip.top,
            left: layout.clip.left,
            width: layout.clip.width,
            height: layout.clip.height,
          }}
        >
          <div
            className={styles.highlight}
            style={{
              top: layout.highlight.top - layout.clip.top,
              left: layout.highlight.left - layout.clip.left,
              width: layout.highlight.width,
              height: layout.highlight.height,
            }}
          />
        </div>
      )}
      <BeginnerTutorialCard
        step={currentStep}
        stepIndex={stepIndex}
        cardRef={cardRef}
        position={{ top: layout.top, left: layout.left }}
        onStart={startTour}
        onSkip={completeAndClose}
        onBack={handleBack}
        onNext={handleNext}
        onClose={completeAndClose}
      />
    </>
  );
}
