const mongoose = require("mongoose");

const projectAnalyticsSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },

    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    pendingTasks: { type: Number, default: 0 },
    blockedTasks: { type: Number, default: 0 },

    averageVelocity: { type: Number, default: 0 },

    riskIndex: { type: Number, default: 0 },

    teamPerformance: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        completedStoryPoints: Number,
        assignedTasks: Number,
      },
    ],

    lastCalculatedAt: Date,
  },
  { timestamps: true }
);

projectAnalyticsSchema.index({ projectId: 1 });

module.exports = mongoose.model(
  "ProjectAnalytics",
  projectAnalyticsSchema
);