/**
 * DealFlow360 — Real-Time Synchronization Bus (Admin App)
 * Multi-layer real-time sync uniting:
 * 1. BroadcastChannel (Zero-latency same-origin tab-to-tab sync)
 * 2. Server-Sent Events (SSE) (Live cross-origin, cross-device backend streaming)
 * 3. HTTP Event Relay (Background event broadcast to SSE hub)
 */

const CHANNEL_NAME = 'dealflow360_sync_bus';
const BASE_API = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:8008/api/v1';

class SyncBus {
  constructor() {
    this._listeners = new Map(); // topic -> Set<Function>
    this._broadcastChannel = null;
    this._eventSource = null;
    this._reconnectTimer = null;
    this._retryDelay = 1500;
    this._isConnecting = false;

    this._initBroadcastChannel();
    this._initSSE();
  }

  // --- BroadcastChannel (Local Tabs) ---
  _initBroadcastChannel() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this._broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      this._broadcastChannel.onmessage = (event) => {
        if (!event.data || typeof event.data !== 'object') return;
        const { topic, payload, originSource } = event.data;
        if (originSource === 'local_tab') {
          this._dispatchLocally(topic, payload, false);
        }
      };
    } catch (err) {
      console.warn('[SyncBus] BroadcastChannel not supported in this environment.', err);
    }
  }

  // --- Server-Sent Events (Cross-Device & Backend Stream) ---
  _initSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this._isConnecting || this._eventSource) return;

    this._isConnecting = true;
    const sseUrl = `${BASE_API}/events`;

    try {
      this._eventSource = new EventSource(sseUrl);

      this._eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.topic) {
            this._dispatchLocally(data.topic, data.payload || {}, true);
          }
        } catch {
          // Ignored malformed message
        }
      });

      this._eventSource.addEventListener('connected', () => {
        this._retryDelay = 1500;
        this._isConnecting = false;
      });

      this._eventSource.onerror = () => {
        this._cleanupSSE();
        this._scheduleReconnect();
      };

      this._eventSource.onopen = () => {
        this._retryDelay = 1500;
        this._isConnecting = false;
      };
    } catch {
      this._cleanupSSE();
      this._scheduleReconnect();
    }
  }

  _cleanupSSE() {
    if (this._eventSource) {
      try {
        this._eventSource.close();
      } catch {
        // ignore
      }
      this._eventSource = null;
    }
    this._isConnecting = false;
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._retryDelay = Math.min(this._retryDelay * 1.5, 15000);
      this._initSSE();
    }, this._retryDelay);
  }

  // --- Dispatching ---
  _dispatchLocally(topic, payload, alsoBroadcast = false) {
    // Topic specific listeners
    const topicSet = this._listeners.get(topic);
    if (topicSet) {
      topicSet.forEach((fn) => {
        try {
          fn(payload, topic);
        } catch (err) {
          console.error(`[SyncBus] Error in listener for topic "${topic}":`, err);
        }
      });
    }

    // Wildcard listeners
    const wildcardSet = this._listeners.get('*');
    if (wildcardSet) {
      wildcardSet.forEach((fn) => {
        try {
          fn(payload, topic);
        } catch (err) {
          console.error('[SyncBus] Error in wildcard listener:', err);
        }
      });
    }

    // Broadcast across other tabs if received from SSE
    if (alsoBroadcast && this._broadcastChannel) {
      try {
        this._broadcastChannel.postMessage({ topic, payload, originSource: 'sse_stream' });
      } catch {
        // ignore
      }
    }
  }

  // --- Public API ---
  /**
   * Subscribe to real-time events for a topic (e.g. 'products', 'warehouses', 'quotes', 'subscriptions', or '*')
   * @param {string} topic
   * @param {Function} callback (payload, topic) => void
   * @returns {Function} unsubscribe function
   */
  subscribe(topic, callback) {
    if (typeof callback !== 'function') return () => {};

    if (!this._listeners.has(topic)) {
      this._listeners.set(topic, new Set());
    }
    this._listeners.get(topic).add(callback);

    return () => {
      const set = this._listeners.get(topic);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this._listeners.delete(topic);
      }
    };
  }

  /**
   * Publish an event locally, to other browser tabs, and to the backend SSE relay.
   * @param {string} topic
   * @param {object} payload
   */
  publish(topic, payload = {}) {
    // 1. Dispatch locally
    this._dispatchLocally(topic, payload, false);

    // 2. Broadcast to other tabs in same origin
    if (this._broadcastChannel) {
      try {
        this._broadcastChannel.postMessage({ topic, payload, originSource: 'local_tab' });
      } catch {
        // ignore
      }
    }

    // 3. Relay to backend SSE endpoint for cross-origin & cross-device propagation
    try {
      fetch(`${BASE_API}/events/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, payload }),
      }).catch(() => {
        // Quietly fail if backend is unreachable; local & broadcast tabs are already updated
      });
    } catch {
      // ignore
    }
  }
}

const syncBus = new SyncBus();
export default syncBus;
