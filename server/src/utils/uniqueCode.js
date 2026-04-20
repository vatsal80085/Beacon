import User from "../modules/user/user.model.js";

export const generateUniqueUserCode = async () => {
  const users = await User.find({}, { uniqueCode: 1 }).lean();
  const existing = new Set(users.map((user) => user.uniqueCode));
  let next = users.length + 1;

  while (existing.has(`BCN-${String(next).padStart(4, "0")}`)) {
    next += 1;
  }

  return `BCN-${String(next).padStart(4, "0")}`;
};
