import { useCallback, useEffect, useState } from 'react';
import { Unlink } from 'lucide-react';
import { Button, ErrorBanner } from '../ui';
import { ERROR_MESSAGES, SNAPTRADE_CONNECTABLE_BROKERS } from '../../constants';
import {
  disconnectBrokerSyncConnection,
  fetchBrokerSyncConnections,
  type BrokerageConnectionSummary,
} from '../../api/brokerSyncApi';
import { getRejectedMessage } from '../../utils/apiError';
import styles from './BrokerConnectionsList.module.scss';

function logoForSlug(slug: string, remoteLogoUrl: string | null): string | null {
  const known = SNAPTRADE_CONNECTABLE_BROKERS.find((broker) => broker.id === slug);
  return known?.logoUrl ?? remoteLogoUrl;
}

function formatConnectedAt(value: string | null): string {
  if (!value) {
    return 'Connected';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Connected';
  }

  return `Connected ${parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

interface BrokerConnectionsListProps {
  heading?: string;
  hint?: string;
}

export function BrokerConnectionsList({
  heading = 'Connected brokerages',
  hint = 'Disconnect removes the SnapTrade authorization. Synced holdings stay in your portfolio until you delete them.',
}: BrokerConnectionsListProps) {
  const [connections, setConnections] = useState<BrokerageConnectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDisconnectId, setPendingDisconnectId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const loadConnections = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setConnections(await fetchBrokerSyncConnections());
    } catch (loadError) {
      setErrorMessage(getRejectedMessage(loadError, ERROR_MESSAGES.BROKER_SYNC_LIST_FAILED));
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialConnections(): Promise<void> {
      try {
        const nextConnections = await fetchBrokerSyncConnections();
        if (isCancelled) {
          return;
        }

        setConnections(nextConnections);
        setErrorMessage(null);
      } catch (loadError) {
        if (isCancelled) {
          return;
        }

        setErrorMessage(getRejectedMessage(loadError, ERROR_MESSAGES.BROKER_SYNC_LIST_FAILED));
        setConnections([]);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialConnections();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleDisconnect(authorizationId: string): Promise<void> {
    setDisconnectingId(authorizationId);
    setErrorMessage(null);

    try {
      await disconnectBrokerSyncConnection(authorizationId);
      setPendingDisconnectId(null);
      await loadConnections();
    } catch (disconnectError) {
      setErrorMessage(
        getRejectedMessage(disconnectError, ERROR_MESSAGES.BROKER_SYNC_DISCONNECT_FAILED)
      );
    } finally {
      setDisconnectingId(null);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="broker-connections-heading">
      <div className={styles.header}>
        <h3 id="broker-connections-heading" className={styles.title}>
          {heading}
        </h3>
        <p className={styles.hint}>{hint}</p>
      </div>

      {isLoading && <p className={styles.status}>Loading connections…</p>}

      {!isLoading && connections.length === 0 && !errorMessage && (
        <p className={styles.status}>No brokerage connected.</p>
      )}

      {connections.length > 0 && (
        <ul className={styles.list}>
          {connections.map((connection) => {
            const logoUrl = logoForSlug(connection.brokerageSlug, connection.logoUrl);
            const isPending = pendingDisconnectId === connection.id;
            const isDisconnecting = disconnectingId === connection.id;

            return (
              <li key={connection.id} className={styles.row}>
                <div className={styles.identity}>
                  {logoUrl ? (
                    <img className={styles.logo} src={logoUrl} alt="" width={28} height={28} />
                  ) : (
                    <span className={styles.logoFallback} aria-hidden>
                      {connection.brokerageName.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <p className={styles.name}>{connection.brokerageName}</p>
                    <p className={styles.meta}>
                      {formatConnectedAt(connection.connectedAt)}
                      {' · '}
                      {connection.accessType === 'read' ? 'Read-only' : 'Trade-enabled'}
                      {connection.disabled ? ' · Needs reconnect' : ''}
                    </p>
                  </div>
                </div>

                {isPending ? (
                  <div className={styles.actions}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleDisconnect(connection.id)}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? 'Disconnecting…' : 'Confirm disconnect'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDisconnectId(null)}
                      disabled={isDisconnecting}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Unlink size={14} />}
                    onClick={() => setPendingDisconnectId(connection.id)}
                    disabled={disconnectingId !== null}
                  >
                    Disconnect
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {errorMessage && <ErrorBanner message={errorMessage} className={styles.error} />}
    </section>
  );
}
