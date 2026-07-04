const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const vinylsController = require("../controllers/vinylsController");

// CREATE
router.post("/", auth, vinylsController.createVinyl);

// READ all user vinyls
router.get("/", auth, vinylsController.getUserVinyls);

// SEARCH vinylsgit status
router.get("/search", auth, vinylsController.searchVinyls);

// proxy vers l'API iTunes (évite les soucis de CORS côté navigateur)
router.get("/cover-art", auth, vinylsController.getCoverArt);

// READ one vinyl
router.get("/:id", auth, vinylsController.getOneVinyl);

// UPDATE
router.put("/:id", auth, vinylsController.updateVinyl);

// DELETE
router.delete("/:id", auth, vinylsController.deleteVinyl);

module.exports = router;