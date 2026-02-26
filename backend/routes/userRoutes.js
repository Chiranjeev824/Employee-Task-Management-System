const express = require("express");
const router = express.Router();

const { getEmployees } = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/employees", protect, adminOnly, getEmployees);

module.exports = router;
