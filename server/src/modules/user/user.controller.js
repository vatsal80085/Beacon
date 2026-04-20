import User from "./user.model.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { HttpError } from "../../utils/httpError.js";

const sanitize = (user) => {
  const payload = user.toObject ? user.toObject() : { ...user };
  delete payload.passwordHash;
  payload.id = String(payload._id ?? payload.id);
  return payload;
};

export const listUsersController = async (_req, res) => {
  const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 });
  sendSuccess(res, users.map(sanitize));
};

export const getUserController = async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash");
  if (!user) {
    throw new HttpError(404, "User not found.");
  }
  sendSuccess(res, sanitize(user));
};

export const updateUserController = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new HttpError(404, "User not found.");
  }
  user.name = req.body.name ?? user.name;
  user.role = req.body.role ?? user.role;
  user.capacityPerSprint =
    req.body.capacityPerSprint !== undefined ? Number(req.body.capacityPerSprint) : user.capacityPerSprint;
  user.status = req.body.status ?? user.status;
  await user.save();
  sendSuccess(res, sanitize(user), "User updated successfully.");
};

export const deleteUserController = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw new HttpError(404, "User not found.");
  }
  sendSuccess(res, { deletedUserId: req.params.id }, "User deleted successfully.");
};
