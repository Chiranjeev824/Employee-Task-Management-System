require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function normalizeEmails() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskdb";

  await mongoose.connect(mongoUri);

  const users = await User.find({}, { email: 1 }).lean();
  const normalizedToId = new Map();

  // Build a map of normalized emails to existing user IDs for conflict checks.
  for (const user of users) {
    const normalized = (user.email || "").trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    if (!normalizedToId.has(normalized)) {
      normalizedToId.set(normalized, user._id.toString());
    }
  }

  let updated = 0;
  let skippedConflicts = 0;
  let skippedInvalid = 0;

  for (const user of users) {
    const original = user.email || "";
    const normalized = original.trim().toLowerCase();

    if (!normalized) {
      skippedInvalid += 1;
      continue;
    }

    if (original === normalized) {
      continue;
    }

    const existingOwnerId = normalizedToId.get(normalized);
    if (existingOwnerId && existingOwnerId !== user._id.toString()) {
      skippedConflicts += 1;
      continue;
    }

    const result = await User.updateOne(
      { _id: user._id },
      { $set: { email: normalized } }
    );

    if (result.modifiedCount > 0) {
      updated += 1;
      normalizedToId.set(normalized, user._id.toString());
    }
  }

  console.log(`Emails normalized: ${updated}`);
  console.log(`Skipped (conflicts): ${skippedConflicts}`);
  console.log(`Skipped (invalid/empty): ${skippedInvalid}`);

  await mongoose.disconnect();
}

normalizeEmails().catch(err => {
  console.error("Normalization failed:", err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
