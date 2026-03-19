require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  const [, , usernameOrEmail, newPassword] = process.argv;

  if (!usernameOrEmail || !newPassword) {
    console.error(
      "Usage: node scripts/resetUserPassword.js <username-or-email> <new-password>",
    );
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 50000,
  });

  const user = await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  });

  if (!user) {
    console.error(`User not found: ${usernameOrEmail}`);
    process.exit(1);
  }

  user.password = newPassword;
  await user.save();

  console.log(`Password reset successfully for user: ${user.username}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Failed to reset password:", error);

  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error("Failed to disconnect from MongoDB:", disconnectError);
  }

  process.exit(1);
});
