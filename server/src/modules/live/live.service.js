const KEEP_ALIVE_INTERVAL_MS = 25000;

const clients = new Map();

const unique = (items) => [...new Set(items.filter(Boolean).map((item) => String(item)))];

const writeEvent = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export const openLiveEventStream = (req, res, user) => {
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const userId = String(user.id);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write("retry: 5000\n\n");

  const heartbeatId = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, KEEP_ALIVE_INTERVAL_MS);

  const closeConnection = () => {
    clearInterval(heartbeatId);
    clients.delete(clientId);
  };

  clients.set(clientId, {
    id: clientId,
    userId,
    res,
    close: closeConnection,
  });

  req.on("close", closeConnection);
  req.on("end", closeConnection);
  req.on("error", closeConnection);

  writeEvent(res, {
    type: "connected",
    channels: ["system"],
    connectedAt: new Date().toISOString(),
  });
};

export const publishLiveUpdate = ({ channels = [], userIds = [], ...payload } = {}) => {
  const normalizedChannels = unique(channels);
  const normalizedUserIds = unique(userIds);

  if (normalizedChannels.length === 0) {
    return;
  }

  const eventPayload = {
    ...payload,
    channels: normalizedChannels,
    emittedAt: new Date().toISOString(),
  };

  for (const client of clients.values()) {
    if (normalizedUserIds.length > 0 && !normalizedUserIds.includes(client.userId)) {
      continue;
    }

    try {
      writeEvent(client.res, eventPayload);
    } catch {
      client.close();
    }
  }
};
