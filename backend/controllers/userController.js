const User = require("../models/User");

// Admin: list employee accounts for task assignment.
exports.getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" })
      .select("_id name email")
      .sort({ name: 1, email: 1 });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
