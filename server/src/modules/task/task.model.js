const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
    },
    title: { type: String, required: true },
    description: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    storyPoints: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"],
      default: "TODO",
    },
    risk: {
      level: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "LOW",
      },
      probability: Number,
      impact: Number,
      score: Number,
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
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1 });
taskSchema.index({ sprintId: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model("Task", taskSchema);