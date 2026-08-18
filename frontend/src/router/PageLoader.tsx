import { SESSION_LOADING_LABEL } from '../constants';
import styles from './PageLoader.module.scss';

export function PageLoader() {
  return <div className={styles.loader} role="status" aria-label={SESSION_LOADING_LABEL} />;
}
