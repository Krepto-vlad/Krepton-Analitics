import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  NOT_FOUND_CODE_LABEL,
  NOT_FOUND_HOME_LABEL,
  NOT_FOUND_MESSAGE,
  NOT_FOUND_SMILEY_SRC,
  NOT_FOUND_STATUS_DIGIT,
  NOT_FOUND_TITLE,
  ROUTES,
} from '../../constants';
import styles from './NotFoundPage.module.scss';

const smileyMaskStyle = {
  '--not-found-smiley-url': `url("${NOT_FOUND_SMILEY_SRC}")`,
} as CSSProperties;

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p className={styles.code} aria-label={NOT_FOUND_CODE_LABEL}>
          <span className={styles.digit} aria-hidden="true">
            {NOT_FOUND_STATUS_DIGIT}
          </span>
          <span className={styles.smiley} style={smileyMaskStyle} aria-hidden="true" />
          <span className={styles.digit} aria-hidden="true">
            {NOT_FOUND_STATUS_DIGIT}
          </span>
        </p>
        <h1 className={styles.title}>{NOT_FOUND_TITLE}</h1>
        <p className={styles.message}>{NOT_FOUND_MESSAGE}</p>
        <Link to={ROUTES.HOME} className={styles.homeButton}>
          {NOT_FOUND_HOME_LABEL}
        </Link>
      </div>
    </main>
  );
}
