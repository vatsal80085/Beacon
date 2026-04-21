import { sendSuccess } from "../../utils/apiResponse.js";
import { getProjectForRequester, getSprintForRequester } from "../project/project.permissions.js";
import { buildDashboardOverview, buildProjectAnalytics, buildSprintAnalytics } from "./analytics.service.js";

export const getProjectAnalyticsController = async (req, res) => {
  await getProjectForRequester(req.params.id, req.user, { lean: true });
  sendSuccess(res, await buildProjectAnalytics(req.params.id));
};

export const getSprintAnalyticsController = async (req, res) => {
  await getSprintForRequester(req.params.id, req.user);
  sendSuccess(res, await buildSprintAnalytics(req.params.id));
};

export const getDashboardOverviewController = async (req, res) => {
  const payload = await buildDashboardOverview(req.user.id);
  sendSuccess(res, payload);
};
