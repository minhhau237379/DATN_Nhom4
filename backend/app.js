const express = require("express");
const cors = require("cors");
const session = require("express-session");
const config = require("./config/config");
const mongoose = require("mongoose");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();
const { ensureAdminUser } = require("./utils/bootstrap");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const shopRoutes = require("./routes/shopRoutes");
const userRoutes = require("./routes/userRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/address");
const paymentRoutes = require("./routes/paymentRoutes");

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174,http://localhost:8081,http://14.225.224.132,http://14.225.224.132:3003")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

/* ======================= DATABASE ======================= */
const { connectDB } = require("./config/database");
connectDB().then(() => ensureAdminUser().catch((err) => {
  console.error("[bootstrap] Failed to ensure admin user:", err.message);
}));

/* ======================= CORS (QUAN TRỌNG) ======================= */
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

/* ======================= MIDDLEWARE ======================= */
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================= SESSION ======================= */
app.set("trust proxy", 1);
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax"
  }
}));

/* ======================= STATIC ======================= */
app.use(express.static(path.join(__dirname, "public")));

/* ======================= API ROUTES ======================= */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

/* ======================= PAGE ROUTES ======================= */
app.use("/api/shop", shopRoutes);
app.use("/api/favorite", favoriteRoutes);
app.use("/api/profile", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/orders", orderRoutes);
app.use("/orders", orderRoutes);
app.use("/api/address", addressRoutes);
app.use("/payment/vnpay", paymentRoutes);
/* ======================= HEALTH CHECK ======================= */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    time: new Date().toISOString(),
  });
});

/* ======================= ERROR HANDLING ======================= */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;
