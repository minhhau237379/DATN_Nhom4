const User = require("../models/User");
const config = require("../config/config");

const ensureAdminUser = async () => {
  const adminCount = await User.countDocuments({ role: "admin" });

  if (adminCount > 0) {
    return;
  }

  const demoAdmin = config.demo?.users?.find((user) => user.username === "admin") || {};

  const username = process.env.ADMIN_USERNAME || demoAdmin.username || "admin";
  const email = process.env.ADMIN_EMAIL || demoAdmin.email || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || demoAdmin.password || "Admin@123";
  const phoneNumber = process.env.ADMIN_PHONE || demoAdmin.phoneNumber || "0909090909";

  const existing = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      existing.password = password;
      existing.phoneNumber = existing.phoneNumber || phoneNumber;
      await existing.save();
      console.log(`[bootstrap] Promoted existing account to admin: ${existing.username}`);
      return;
    }

    console.log(`[bootstrap] Admin account already exists: ${existing.username}`);
    return;
  }

  await User.create({
    username,
    email,
    password,
    phoneNumber,
    role: "admin",
  });

  console.log(`[bootstrap] Created default admin account: ${username}`);
};

module.exports = {
  ensureAdminUser,
};
