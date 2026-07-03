require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB(); // si ta fonction retourne une promesse

    app.listen(PORT, () => {
      console.log(`🚀 GrooveBox API sur le port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Erreur DB :", err);
    process.exit(1);
  }
};

startServer();