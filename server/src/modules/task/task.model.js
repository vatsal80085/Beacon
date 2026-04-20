import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    storyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"],
      default: "TODO",
    },
    risk: {
      score: {
        type: Number,
        default: 0.2,
        min: 0,
        max: 1,
      },
      level: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "LOW",
      },
      probability: Number,
      impact: Number,
    },
    businessValue: {
      type: Number,
      default: 6,
      min: 0,
    },
    riskFactor: {
      type: Number,
      default: 5,
      min: 0,
    },
    urgency: {
      type: Number,
      default: 5,
      min: 0,
    },
    activityLogs: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        action: String,
        from: String,
        to: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

taskSchema.index({ projectId: 1 });
taskSchema.index({ sprintId: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });

export default mongoose.model("Task", taskSchema);
