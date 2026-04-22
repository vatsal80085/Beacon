import { getAuthTokenFromRequest, verifyAuthToken } from "../../middleware/auth.js";
import { openLiveEventStream } from "./live.service.js";

export const streamLiveEventsController = (req, res) => {
  const token = getAuthTokenFromRequest(req, { allowQueryToken: true });

  if (!token) {
    return res.status(401).json({ success: false, error: "No token provided." });
  }

  try {
    const user = verifyAuthToken(token);
    openLiveEventStream(req, res, user);
    return undefined;
  } catch (_error) {
    return res.status(401).json({ success: false, error: "Invalid token." });
  }
};
