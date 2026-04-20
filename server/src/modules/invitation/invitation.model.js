import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    inviteeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteeUniqueCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    invitedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["MANAGER", "DEVELOPER", "QA"],
      default: "DEVELOPER",
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED"],
      default: "PENDING",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

invitationSchema.index({ projectId: 1, inviteeUserId: 1, status: 1 });

export default mongoose.model("Invitation", invitationSchema);
