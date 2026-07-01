const express = require("express");








const cors = require("cors");

const usersRouter = require("./routes/users");
const vinylsRouter = require("./routes/vinyls");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Bienvenue sur l'API GrooveBox !" });
});

app.use("/users", usersRouter);
app.use("/vinyls", vinylsRouter);

module.exports = app;