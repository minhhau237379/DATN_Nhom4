const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    console.log('🌐 Connecting to:', process.env.MONGODB_URI);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 50000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    isConnected = true;
    return conn;

  } catch (error) {
    console.error('❌ MongoDB ERROR:', error.message);
    isConnected = false;
  }
};

module.exports = { connectDB };