const Vinyl = require("../models/Vinyl");

// créer vinyle
exports.createVinyl = async (req, res) => {
  try {
    const { title, artist, year, genre, cover } = req.body;

    const newVinyl = new Vinyl({
      title,
      artist,
      year,
      genre,
      cover,
      user: req.user.userId,
    });

    await newVinyl.save();

    res.status(201).json({
      message: "Vinyle ajouté !",
      vinyl: newVinyl,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// proxy vers l'API iTunes (évite les soucis de CORS côté navigateur)
exports.getCoverArt = async (req, res) => {
  try {
    const { title, artist } = req.query;

    if (!title || !artist) {
      return res.status(400).json({ message: "title et artist sont requis" });
    }

    const query = encodeURIComponent(`${artist} ${title}`);
    const response = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&entity=album&limit=1`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const cover = data.results[0].artworkUrl100.replace(/\d+x\d+bb/, "600x600bb");
      return res.json({ cover });
    }

    return res.json({ cover: null });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// récupérer vinyles user
exports.getUserVinyls = async (req, res) => {
  try {
    const vinyls = await Vinyl.find({ user: req.user.userId });

    res.json(vinyls);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// rechercher vinyles
exports.searchVinyls = async (req, res) => {
  try {
    const { title, artist, genre } = req.query;

    let filter = {
      user: req.user.userId,
    };

    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    if (artist) {
      filter.artist = { $regex: artist, $options: "i" };
    }

    if (genre) {
      filter.genre = { $regex: genre, $options: "i" };
    }

    const vinyls = await Vinyl.find(filter);

    res.json(vinyls);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// récupérer un vinyle
exports.getOneVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!vinyl) {
      return res.status(404).json({ message: "Vinyle introuvable" });
    }

    res.json(vinyl);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// mettre à jour vinyle
exports.updateVinyl = async (req, res) => {
  try {
    const updatedVinyl = await Vinyl.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      req.body,
      { new: true }
    );

    if (!updatedVinyl) {
      return res.status(404).json({ message: "Vinyle introuvable" });
    }

    res.json({
      message: "Vinyle mis à jour",
      vinyl: updatedVinyl,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// supprimer vinyle
exports.deleteVinyl = async (req, res) => {
  try {
    const deletedVinyl = await Vinyl.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!deletedVinyl) {
      return res.status(404).json({ message: "Vinyle introuvable" });
    }

    res.json({ message: "Vinyle supprimé" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
