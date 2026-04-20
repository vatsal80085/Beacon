import { getMeProfile, loginUser, registerUser } from "../services/auth.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const register = async (req, res) => {
  const payload = await registerUser(req.body);
  sendSuccess(res, payload, "User registered successfully.", 201);
};

export const login = async (req, res) => {
  const payload = await loginUser(req.body);
  sendSuccess(res, payload, "Login successful.");
};

export const logout = async (_req, res) => {
  sendSuccess(res, null, "Logout successful.");
};

export const getMe = async (req, res) => {
  const user = await getMeProfile(req.user.id);
  sendSuccess(res, user);
};
