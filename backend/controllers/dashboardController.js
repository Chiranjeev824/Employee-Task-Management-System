const Task = require("../models/Task");
const User = require("../models/User");

// Admin dashboard
exports.adminDashboard = async (req, res) => {
  try {
    // Aggregate top-level counts for admin dashboard cards.
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const totalUsers = await User.countDocuments({ role: "employee" });

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      totalUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Employee dashboard
exports.employeeDashboard = async (req, res) => {
  try {
    // Restrict counts to logged-in employee (id comes from verified JWT).
    const myTasks = await Task.countDocuments({ assignedTo: req.user.id });
    const completed = await Task.countDocuments({
      assignedTo: req.user.id,
      status: "Completed"
    });
    const pending = await Task.countDocuments({
      assignedTo: req.user.id,
      status: "Pending"
    });

    res.json({
      myTasks,
      completed,
      pending
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
