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

// READ one vinyl
router.get("/:id", auth, vinylsController.getOneVinyl);

// UPDATE
router.put("/:id", auth, vinylsController.updateVinyl);

// DELETE
router.delete("/:id", auth, vinylsController.deleteVinyl);

module.exports = router;