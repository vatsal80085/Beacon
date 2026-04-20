import jwt from "jsonwebtoken";

export const authMiddleWare = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, error: "No token provided." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_error) {
    return res.status(401).json({ success: false, error: "Invalid token." });
  }
};
