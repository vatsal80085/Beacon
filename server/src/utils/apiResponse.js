export const sendSuccess = (res, data = null, message = "", status = 200) => {
  res.status(status).json({
    success: true,
    data,
    message,
  });
};

export const sendError = (res, error, status = 400) => {
  res.status(status).json({
    success: false,
    error,
  });
};
