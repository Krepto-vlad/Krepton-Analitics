import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DASHBOARD_CARD_ARROW_ATTRIBUTE, DASHBOARD_CARD_LINK_ICON_SIZE_PX } from '../../constants';
import styles from './CardCornerLink.module.scss';

interface CardCornerLinkProps {
  to: string;
  /** Spoken name and tooltip, for example "Open watchlist". */
  label: string;
}

/**
 * The only focusable and announced way into the related page. Mouse users can also click
 * anywhere on the card (see `useCardNavigation`); the arrow shows that the card is clickable.
 */
export function CardCornerLink({ to, label }: CardCornerLinkProps) {
  return (
    <div className={styles.footer}>
      <Link
        to={to}
        className={styles.link}
        aria-label={label}
        title={label}
        {...{ [DASHBOARD_CARD_ARROW_ATTRIBUTE]: '' }}
      >
        <ArrowRight size={DASHBOARD_CARD_LINK_ICON_SIZE_PX} aria-hidden="true" focusable="false" />
      </Link>
    </div>
  );
}
