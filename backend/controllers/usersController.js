const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const JWT_SECRET = process.env.JWT_SECRET;

const User = require("../models/User");

// Inscription utilisateur
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. créer utilisateur avec password hashé
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // on ne renvoie pas le password
    res.status(201).json({
      message: "Utilisateur créé avec succès !",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });

  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Connexion utilisateur
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("EMAIL REÇU :", email); // 👈 ICI

    const user = await User.findOne({ email });

    console.log("USER TROUVÉ :", user); // 👈 et ici pour debug

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // 2. comparer les mots de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    // 3. générer token JWT
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 4. réponse
    res.json({
      message: "Connexion réussie",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    });

  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};