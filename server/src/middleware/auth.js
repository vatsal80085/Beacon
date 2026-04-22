import jwt from "jsonwebtoken";

const resolveUserIdFromPayload = (payload) =>
  payload?.id ??
  payload?._id ??
  payload?.userId ??
  payload?.sub ??
  payload?.user?.id ??
  payload?.user?._id ??
  payload?.user?.userId;

export const getAuthTokenFromRequest = (req, { allowQueryToken = false } = {}) => {
  const authorizationHeader = req.headers.authorization ?? "";
  const headerToken = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice("Bearer ".length) : "";

  if (headerToken) {
    return headerToken;
  }

  if (!allowQueryToken) {
    return "";
  }

  const queryToken = req.query?.accessToken ?? req.query?.token ?? "";
  return typeof queryToken === "string" ? queryToken : "";
};

export const verifyAuthToken = (token) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const userId = resolveUserIdFromPayload(payload);

  if (!userId) {
    throw new Error("Invalid token payload.");
  }

  return {
    ...payload,
    id: userId,
  };
};

export const authMiddleWare = async (req, res, next) => {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, error: "No token provided." });
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch (_error) {
    return res.status(401).json({ success: false, error: "Invalid token." });
  }
};
