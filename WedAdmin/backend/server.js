const express = require("express");
const path = require("path");

const app = require("./app");

const PORT = process.env.PORT || 3003;

// Static folder
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
});