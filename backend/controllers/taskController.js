const Task = require("../models/Task");
const User = require("../models/User");
const mongoose = require("mongoose");

async function resolveAssigneeToId(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return null;

  if (mongoose.Types.ObjectId.isValid(value)) {
    return value;
  }

  const user = await User.findOne({ email: value }).select("_id");
  return user ? user._id : null;
}

// Admin create task
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, deadline, status } = req.body;
    const basePayload = { title, description, priority, deadline, status };

    const inputAssignees = Array.isArray(req.body.assignees)
      ? req.body.assignees
      : req.body.assignedTo
        ? [req.body.assignedTo]
        : [];

    if (!inputAssignees.length) {
      const task = await Task.create({ ...basePayload, assignedTo: undefined });
      return res.status(201).json(task);
    }

    const resolvedIds = [];
    const invalidAssignees = [];

    for (const assignee of inputAssignees) {
      const resolved = await resolveAssigneeToId(assignee);
      if (!resolved) {
        invalidAssignees.push(String(assignee));
        continue;
      }
      resolvedIds.push(String(resolved));
    }

    if (invalidAssignees.length) {
      return res.status(400).json({
        message: `Assigned user not found for: ${invalidAssignees.join(", ")}`,
        invalidAssignees
      });
    }

    const uniqueAssigneeIds = [...new Set(resolvedIds)];
    const docsToCreate = uniqueAssigneeIds.map(id => ({
      ...basePayload,
      assignedTo: id
    }));

    if (docsToCreate.length === 1) {
      const [task] = await Task.create(docsToCreate);
      return res.status(201).json(task);
    }

    const tasks = await Task.insertMany(docsToCreate);
    return res.status(201).json({
      message: `Created ${tasks.length} tasks`,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get tasks (admin = all, employee = own)
exports.getTasks = async (req, res) => {
  try {
    let tasks;

    if (req.user.role === "admin") {
      tasks = await Task.find().populate("assignedTo", "name email");
    } else {
      tasks = await Task.find({ assignedTo: req.user.id });
    }

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete task (admin only)
exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
