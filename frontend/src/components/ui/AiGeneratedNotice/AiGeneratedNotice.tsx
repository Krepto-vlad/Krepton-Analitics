import { Sparkles } from 'lucide-react';
import { AI_GENERATED_HALLUCINATION_CAVEAT, AI_GENERATED_LABEL } from '../../../constants';
import styles from './AiGeneratedNotice.module.scss';

export function AiGeneratedNotice() {
  return (
    <p className={styles.notice} role="note">
      <Sparkles size={12} aria-hidden />
      <span>
        <strong>{AI_GENERATED_LABEL}.</strong> {AI_GENERATED_HALLUCINATION_CAVEAT}
      </span>
    </p>
  );
}
