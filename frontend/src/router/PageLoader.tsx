import { LOADING_MESSAGES } from '../constants';
import { ContentSkeleton } from '../components/ui';
import styles from './PageLoader.module.scss';

export function PageLoader() {
  return (
    <div className={styles.loader}>
      <ContentSkeleton preset="page" label={LOADING_MESSAGES.SESSION} />
    </div>
  );
}
