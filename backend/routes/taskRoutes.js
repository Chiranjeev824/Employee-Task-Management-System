const express = require("express");
const router = express.Router();

const {
  createTask,
  getTasks,
  updateTaskStatus,
  deleteTask
} = require("../controllers/taskController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/", protect, adminOnly, createTask);
router.get("/", protect, getTasks);
router.put("/:id", protect, updateTaskStatus);
router.delete("/:id", protect, adminOnly, deleteTask);

module.exports = router;