import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Over-the-air updates, without waiting for a cold start.
 *
 * By default an iPhone only switches to a new update when Munib is fully closed and opened again, which people
 * rarely do, so changes could take days to show. Here Munib checks whenever it opens or comes back to the front,
 * downloads anything new, and switches over at a moment nobody notices: straight away if it has only just launched
 * (still on the opening screen), otherwise the next time it goes into the background.
 */
export function useLiveUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const launchedAt = Date.now();
    let ready = false;
    let busy = false;
    const check = async () => {
      if (busy || ready) return;
      busy = true;
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) {
          const got = await Updates.fetchUpdateAsync();
          if (got.isNew) {
            ready = true;
            if (Date.now() - launchedAt < 8000) await Updates.reloadAsync();
          }
        }
      } catch {
        /* offline or the update server is unreachable: try again next time */
      } finally {
        busy = false;
      }
    };
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
      else if (s === 'background' && ready) Updates.reloadAsync().catch(() => {});
    });
    return () => sub.remove();
  }, []);
}
