import { useEffect, useRef, useState } from 'react';
import { TAB_LEADER_HEARTBEAT_MS, TAB_LEADER_TTL_MS } from '../constants';

interface LeaderRecord {
  tabId: string;
  lastHeartbeat: number;
}

function readLeaderRecord(storageKey: string): LeaderRecord | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LeaderRecord;
    if (typeof parsed.tabId === 'string' && typeof parsed.lastHeartbeat === 'number') {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function writeLeaderRecord(storageKey: string, record: LeaderRecord): void {
  localStorage.setItem(storageKey, JSON.stringify(record));
}

/**
 * Elects a single leader tab per channel so interval polling runs only once
 * per browser profile, even when multiple windows are open.
 */
export function useTabLeader(channelId: string): boolean {
  const [isLeader, setIsLeader] = useState(false);
  const tabIdRef = useRef(crypto.randomUUID());
  const storageKey = `ka-tab-leader:${channelId}`;

  useEffect(() => {
    const tabId = tabIdRef.current;

    const claimLeadership = (): boolean => {
      const now = Date.now();
      const currentLeader = readLeaderRecord(storageKey);

      if (!currentLeader || now - currentLeader.lastHeartbeat > TAB_LEADER_TTL_MS) {
        writeLeaderRecord(storageKey, { tabId, lastHeartbeat: now });
        setIsLeader(true);
        return true;
      }

      const isCurrentLeader = currentLeader.tabId === tabId;
      setIsLeader(isCurrentLeader);
      return isCurrentLeader;
    };

    claimLeadership();

    const heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const currentLeader = readLeaderRecord(storageKey);

      if (currentLeader?.tabId === tabId) {
        writeLeaderRecord(storageKey, { tabId, lastHeartbeat: now });
        setIsLeader(true);
        return;
      }

      if (!currentLeader || now - currentLeader.lastHeartbeat > TAB_LEADER_TTL_MS) {
        claimLeadership();
        return;
      }

      setIsLeader(false);
    }, TAB_LEADER_HEARTBEAT_MS);

    const handleStorage = (event: StorageEvent): void => {
      if (event.key === storageKey) {
        claimLeadership();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('storage', handleStorage);

      const currentLeader = readLeaderRecord(storageKey);
      if (currentLeader?.tabId === tabId) {
        localStorage.removeItem(storageKey);
      }
    };
  }, [storageKey]);

  return isLeader;
}
