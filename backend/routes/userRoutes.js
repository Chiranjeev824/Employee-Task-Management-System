const express = require("express");
const router = express.Router();

const { getEmployees, createEmployee } = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/employees", protect, adminOnly, getEmployees);
router.post("/employees", protect, adminOnly, createEmployee);

module.exports = router;
