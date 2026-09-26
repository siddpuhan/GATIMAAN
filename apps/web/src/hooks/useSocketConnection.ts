import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket.js';
import type { LiveState } from '../components/citizen/LiveIndicator.js';

/**
 * useSocketConnection (Phase U1): read-only view of the existing Socket.IO
 * singleton's connection state, for UI display via <LiveIndicator>.
 *
 * STRICT SCOPE NOTE: this hook does NOT create, reconfigure, or disconnect
 * the socket, and does not alter any subscription/room/event contracts.
 * It only listens to the connection lifecycle events that socket.io-client
 * already emits, so future phases (U2–U5) can show citizens plain-language
 * "Live / Updating / Reconnecting / Unavailable" states.
 */
export function useSocketConnection(): { liveState: LiveState; connected: boolean } {
  const [liveState, setLiveState] = useState<LiveState>('reconnecting');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      setLiveState('live');
    };
    const onDisconnect = () => {
      setConnected(false);
      setLiveState('offline');
    };
    const onReconnect = () => {
      setConnected(true);
      setLiveState('live');
    };
    const onReconnectAttempt = () => {
      setConnected(false);
      setLiveState('reconnecting');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect', onReconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);

    // Initialize from current connection state
    if (socket.connected) {
      setConnected(true);
      setLiveState('live');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect', onReconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
    };
  }, []);

  return { liveState, connected };
}
