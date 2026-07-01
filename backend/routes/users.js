const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const usersController = require("../controllers/usersController");

// Route d'inscription
router.post("/signup", usersController.signup);

// Route de connexion
router.post("/login", usersController.login);


// Route pour récupérer le profil de l'utilisateur connecté
router.get("/profile", auth, (req, res) => {
  res.json({
    message: "Profil utilisateur",
    user: req.user
  });
});

module.exports = router;