const { verifyToken } = require("./auth");

/**
 * requireRole("admin")
 * requireRole("admin", "worker")
 * Returns middleware that checks req.user.role
 */
function requireRole(...roles) {
  return [
    verifyToken,
    (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!roles.includes(req.user.role))
        return res.status(403).json({ error: `Access denied. Required role: ${roles.join(" or ")}` });
      next();
    },
  ];
}

module.exports = { requireRole };
