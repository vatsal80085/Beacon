import { useEffect, useRef } from "react";
import { api } from "../api/axios.js";
import { normalizeLiveChannels } from "../realtime/liveChannels.js";

const DEFAULT_INTERVAL_MS = 30000;
const DEFAULT_DEBOUNCE_MS = 250;
const SAME_TAB_EVENT = "beacon:live-refresh";
const STORAGE_KEY_PREFIX = "beacon:live-refresh:";
const streamManagers = new Map();

const getStorageKey = (channel) => `${STORAGE_KEY_PREFIX}${channel}`;

const getChannelFromStorageKey = (storageKey = "") =>
  storageKey.startsWith(STORAGE_KEY_PREFIX) ? storageKey.slice(STORAGE_KEY_PREFIX.length) : "";

const getLiveEventsUrl = (token) => {
  const baseUrl = String(api.defaults.baseURL ?? "http://localhost:5050/api").replace(/\/$/, "");
  return `${baseUrl}/live/events?accessToken=${encodeURIComponent(token)}`;
};

const createStreamManager = (token) => {
  const listeners = new Set();
  const isSupported = typeof window !== "undefined" && typeof window.EventSource !== "undefined";
  const eventSource = isSupported ? new window.EventSource(getLiveEventsUrl(token)) : null;

  if (eventSource) {
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        listeners.forEach((listener) => listener(payload));
      } catch {
        return undefined;
      }
    };
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
          eventSource?.close();
          streamManagers.delete(token);
        }
      };
    },
  };
};

const getStreamManager = (token) => {
  if (!streamManagers.has(token)) {
    streamManagers.set(token, createStreamManager(token));
  }

  return streamManagers.get(token);
};

const matchesSubscription = (payload, subscribedChannels) => {
  if (subscribedChannels.length === 0) {
    return true;
  }

  const incomingChannels = normalizeLiveChannels(payload?.channel, payload?.channels);
  return incomingChannels.some((channel) => subscribedChannels.includes(channel));
};

export const triggerLiveRefresh = (channelInput, payload = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  const channels = normalizeLiveChannels(channelInput, payload?.channels);
  if (channels.length === 0) {
    return;
  }

  const timestamp = Date.now();
  channels.forEach((channel) => {
    window.localStorage.setItem(getStorageKey(channel), String(timestamp));
  });

  window.dispatchEvent(
    new window.CustomEvent(SAME_TAB_EVENT, {
      detail: {
        ...payload,
        channels,
        emittedAt: new Date(timestamp).toISOString(),
      },
    }),
  );
};

export function useLiveRefresh(
  callback,
  { enabled = true, intervalMs = DEFAULT_INTERVAL_MS, debounceMs = DEFAULT_DEBOUNCE_MS, channel = "", channels = [] } = {},
) {
  const callbackRef = useRef(callback);
  const isRefreshingRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  const channelSignature = JSON.stringify(normalizeLiveChannels(channel, channels));

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return undefined;
    }

    let isDisposed = false;
    const subscribedChannels = JSON.parse(channelSignature);

    const runRefresh = async () => {
      if (isDisposed) {
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      if (isRefreshingRef.current) {
        refreshQueuedRef.current = true;
        return;
      }

      isRefreshingRef.current = true;

      try {
        await callbackRef.current?.();
      } catch {
        return undefined;
      } finally {
        isRefreshingRef.current = false;

        if (refreshQueuedRef.current && !isDisposed) {
          refreshQueuedRef.current = false;
          window.setTimeout(() => {
            void runRefresh();
          }, 0);
        }
      }
    };

    const scheduleRefresh = () => {
      if (isDisposed) {
        return;
      }

      if (debounceMs <= 0) {
        void runRefresh();
        return;
      }

      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = window.setTimeout(() => {
        debounceTimeoutRef.current = null;
        void runRefresh();
      }, debounceMs);
    };

    const handleFocus = () => {
      scheduleRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh();
      }
    };

    const handleStorage = (event) => {
      const storageChannel = getChannelFromStorageKey(event.key ?? "");
      if (!storageChannel) {
        return;
      }

      if (subscribedChannels.length === 0 || subscribedChannels.includes(storageChannel)) {
        scheduleRefresh();
      }
    };

    const handleSameTabRefresh = (event) => {
      if (matchesSubscription(event.detail, subscribedChannels)) {
        scheduleRefresh();
      }
    };

    const token = window.localStorage.getItem("beacon:auth_token");
    const unsubscribeStream =
      token && !token.startsWith("demo-token:")
        ? getStreamManager(token)?.subscribe((payload) => {
            if (matchesSubscription(payload, subscribedChannels)) {
              scheduleRefresh();
            }
          }) ?? (() => {})
        : () => {};

    const intervalId = intervalMs > 0 ? window.setInterval(scheduleRefresh, intervalMs) : null;
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(SAME_TAB_EVENT, handleSameTabRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      unsubscribeStream();

      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }

      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SAME_TAB_EVENT, handleSameTabRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [channelSignature, debounceMs, enabled, intervalMs]);
}
