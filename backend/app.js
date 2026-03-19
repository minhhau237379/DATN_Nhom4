const express = require("express");
const cors = require("cors");
const session = require("express-session");
const config = require("./config/config");
const mongoose = require("mongoose");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const shopRoutes = require("./routes/shopRoutes");
const userRoutes = require("./routes/userRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/address");
const paymentRoutes = require("./routes/paymentRoutes");


const app = express();

/* ======================= DATABASE ======================= */
const { connectDB } = require("./config/database");
connectDB();

/* ======================= CORS (QUAN TRỌNG) ======================= */
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8081"],
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

/* ======================= PAGE ROUTES ======================= */
app.use("/api/shop", shopRoutes);
app.use("/api/favorite", favoriteRoutes);
app.use("/api/profile", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
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
