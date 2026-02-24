const mongoose = require("mongoose");

const sprintAnalyticsSchema = new mongoose.Schema(
  {
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      required: true,
      unique: true,
    },

    committedStoryPoints: Number,
    completedStoryPoints: Number,
    velocityScore: Number,

    completionRate: Number,

    riskScore: Number,

    lastCalculatedAt: Date,
  },
  { timestamps: true }
);

sprintAnalyticsSchema.index({ sprintId: 1 });

module.exports = mongoose.model(
  "SprintAnalytics",
  sprintAnalyticsSchema
);