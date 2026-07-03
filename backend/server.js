require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("🚀 GrooveBox API running on port " + PORT);
    });
  } catch (err) {
    console.error("❌ Server crash :", err);
    process.exit(1);
  }
};

start();