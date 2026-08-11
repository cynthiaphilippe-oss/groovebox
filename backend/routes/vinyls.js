const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const vinylsController = require("../controllers/vinylsController");

// CREATE
router.post("/", auth, vinylsController.createVinyl);

// READ all user vinyls
router.get("/", auth, vinylsController.getUserVinyls);

// SEARCH vinyls
router.get("/search", auth, vinylsController.searchVinyls);

// RECHERCHE DE POCHETTE (doit être avant /:id, sinon Express le confond avec un id)
router.get("/cover-search", auth, vinylsController.searchCoverArt);

// READ one vinyl
router.get("/:id", auth, vinylsController.getOneVinyl);

// UPDATE
router.put("/:id", auth, vinylsController.updateVinyl);

// DELETE
router.delete("/:id", auth, vinylsController.deleteVinyl);

module.exports = router;