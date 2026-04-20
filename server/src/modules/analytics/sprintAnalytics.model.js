import mongoose from "mongoose";

const sprintAnalyticsSchema = new mongoose.Schema(
  {
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      required: true,
      unique: true,
    },
    velocity: {
      type: Number,
      default: 0,
    },
    healthScore: {
      type: Number,
      default: 0,
    },
    riskScore: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
    capacityUtilization: {
      type: Number,
      default: 0,
    },
    committedStoryPoints: {
      type: Number,
      default: 0,
    },
    completedStoryPoints: {
      type: Number,
      default: 0,
    },
    overloadedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastCalculatedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model("SprintAnalytics", sprintAnalyticsSchema);
