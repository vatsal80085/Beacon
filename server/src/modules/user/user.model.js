import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    uniqueCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "DEVELOPER", "QA"],
      default: "DEVELOPER",
    },
    capacityPerSprint: {
      type: Number,
      default: 18,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    avatarHue: {
      type: Number,
      default: 0,
    },
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
