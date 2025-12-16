export const extractClientInfo = (req, res, next) => {
  req.clientInfo = {
    ip:
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress,

    userAgent: req.headers["user-agent"],
    referrer: req.headers.referer || "direct",
  };
  next();
};
