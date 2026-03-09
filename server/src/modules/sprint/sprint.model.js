import mongoose from "mongoose";

const sprintSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    name: { type: String, required: true },
    goal: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ["PLANNED", "ACTIVE", "COMPLETED"],
      default: "PLANNED",
    },
    velocity: {
      committedStoryPoints: { type: Number, default: 0 },
      completedStoryPoints: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "Sprint",
  sprintSchema
);