import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ["PLANNED", "ACTIVE", "COMPLETED"],
      default: "PLANNED",
    },
    startDate: Date,
    endDate: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: String,
      },
    ],
    metrics: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      blockedTasks: { type: Number, default: 0 },
      avgVelocity: { type: Number, default: 0 },
      riskIndex: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "Project",
  projectSchema
);