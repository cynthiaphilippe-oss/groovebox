require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 3000;

// Connexion DB AVANT de démarrer le serveur
connectDB();

app.listen(PORT, () => {
  console.log(`GrooveBox API démarrée sur le port ${PORT}`);
});
