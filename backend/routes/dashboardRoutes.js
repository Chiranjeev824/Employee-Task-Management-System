const express = require("express");
const router = express.Router();

const {
  adminDashboard,
  employeeDashboard
} = require("../controllers/dashboardController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Admin sees platform-wide metrics.
router.get("/admin", protect, adminOnly, adminDashboard);
// Employee sees only their own task metrics.
router.get("/employee", protect, employeeDashboard);

module.exports = router;
