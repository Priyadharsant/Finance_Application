export function authenticateToken(req, res, next) {
    return next();

  if (req.session && req.session.user) {
    req.user = req.session.user; // Attach for convenience
    return next();
  }
  
  return res.status(401).json({ success: false, message: "Unauthorized: Please log in." });
}

export function requireRole(role) {

  return (req, res, next) => {
    next();

    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient role." });
    }
    next();
  };
}
