import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../modules/user/user.model.js";
import { HttpError } from "../utils/httpError.js";
import { generateUniqueUserCode } from "../utils/uniqueCode.js";

const sanitizeUser = (user) => {
  const payload = user.toObject ? user.toObject() : { ...user };
  delete payload.passwordHash;
  return payload;
};

const signToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

export const registerUser = async (data) => {
  const { name, email, password, role, capacityPerSprint } = data;

  if (!name || !email || !password) {
    throw new HttpError(400, "Name, email, and password are required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new HttpError(409, "User already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const uniqueCode = await generateUniqueUserCode();
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    uniqueCode,
    role: role || "DEVELOPER",
    capacityPerSprint: Number(capacityPerSprint ?? 18),
    avatarHue: Math.floor(Math.random() * 360),
  });

  const token = signToken(user);
  return {
    token,
    user: sanitizeUser(user),
  };
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new HttpError(400, "Email and password are required.");
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) {
    throw new HttpError(401, "Invalid credentials.");
  }

  const matched = await bcrypt.compare(password, user.passwordHash);
  if (!matched) {
    throw new HttpError(401, "Invalid credentials.");
  }

  return {
    token: signToken(user),
    user: sanitizeUser(user),
  };
};

export const getMeProfile = async (id) => {
  const user = await User.findById(id).select("-passwordHash");
  if (!user) {
    throw new HttpError(404, "User not found.");
  }
  return user;
};
