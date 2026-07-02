const API = "http://localhost:3000/vinyls";
const MODE = "demo";

/* =========================
   STATE GLOBAL
========================= */
let token = "";
let vinylsData = [];
let editingId = null;
let pendingDeleteId = null; // id du vinyle en attente de confirmation de suppression

let sortState = {
  criteria: null,
  direction: 1
};

/* =========================
   INIT GENERAL
========================= */
const yearInput = document.getElementById("year");
if (yearInput) {
  yearInput.max = new Date().getFullYear();
}

/* =========================
   INIT DEMO
========================= */
if (MODE === "demo") {
  vinylsData = [
    { _id: "1", title: "Nevermind", artist: "Nirvana", year: 1991, genre: "Grunge" },
    { _id: "2", title: "Random Access Memories", artist: "Daft Punk", year: 2013, genre: "Electro" },
    { _id: "3", title: "Back in Black", artist: "AC/DC", year: 1980, genre: "Rock" },
    { _id: "4", title: "The Wall", artist: "Pink Floyd", year: 1979, genre: "Progressive Rock" },
    { _id: "5", title: "Hotel California", artist: "Eagles", year: 1976, genre: "Rock" },
    { _id: "6", title: "Led Zeppelin IV", artist: "Led Zeppelin", year: 1971, genre: "Rock" }
  ];

  refresh();
}

/* =========================
   UI HELPERS
========================= */
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("artist").value = "";
  document.getElementById("year").value = "";
  document.getElementById("genre").value = "";
  document.getElementById("genreOther").value = "";
  document.getElementById("genreOther").style.display = "none";
  document.getElementById("coverUrl").value = "";
}

function toggleGenreOther() {
  const genreSelect = document.getElementById("genre");
  const genreOther = document.getElementById("genreOther");

  genreOther.style.display = genreSelect.value === "Autre" ? "block" : "none";
}

function getSelectedGenre() {
  const genreSelect = document.getElementById("genre").value;

  if (genreSelect === "Autre") {
    return document.getElementById("genreOther").value.trim();
  }

  return genreSelect;
}

function clearSearch() {
  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.value = "";
}

function resetUI() {
  clearForm();
  clearSearch();
}

/* =========================
   TOKEN
========================= */
function saveToken() {
  if (MODE === "demo") {
    alert("Mode demo actif");
    return;
  }

  token = document.getElementById("tokenInput").value;
  alert("Token enregistré !");
}

/* =========================
   LOAD API
========================= */
async function loadVinyls() {
  if (MODE === "demo") {
    refresh();
    return;
  }

  const res = await fetch(API, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  vinylsData = await res.json();
  refresh();
}

/* =========================
   RESET ORDRE (bouton dédié)
========================= */
function resetOrder() {
  sortState.criteria = null;
  sortState.direction = 1;
  refresh();
  showToast("Ordre réinitialisé");
}

/* =========================
   SEARCH + SORT SOURCE UNIQUE
========================= */
function getDisplayedVinyls() {
  let list = [...vinylsData];

  // SEARCH
  const search = document.getElementById("search")?.value.toLowerCase() || "";

  if (search) {
    list = list.filter(v =>
      v.artist.toLowerCase().includes(search) ||
      v.title.toLowerCase().includes(search)
    );
  }

  // SORT
  if (sortState.criteria) {
    list.sort((a, b) => {

      if (sortState.criteria === "year") {
        return sortState.direction * ((a.year || 0) - (b.year || 0));
      }

      return sortState.direction *
        (a[sortState.criteria] || "")
          .toString()
          .toLowerCase()
          .localeCompare((b[sortState.criteria] || "").toString().toLowerCase());
    });
  }

  return list;
}

/* =========================
   RENDER
========================= */
function render(vinyls) {
  const list = document.getElementById("list");
  const count = document.getElementById("count");

  count.textContent = `${vinyls.length} vinyles`;

  if (vinyls.length === 0) {
    list.innerHTML = `
      <p class="empty-state">
        Aucun vinyle trouvé 🎵
      </p>
    `;
    return;
  }

  list.innerHTML = vinyls.map(v => `
    <div class="card">
      <div class="cover">
        ${v.cover
          ? `<img src="${v.cover}" alt="${v.title}" loading="lazy" onerror="handleCoverError(this)">`
          : `<i class="fa-solid fa-record-vinyl"></i>`}
      </div>

      <div class="infos">
        <h3>${v.title}</h3>
        <p class="artist">${v.artist}</p>

        <div class="details">
          <span>${v.year || "-"}</span>
        </div>

        ${v.genre ? `<span class="badge">${v.genre}</span>` : ""}

        <div class="actions">
          <i class="fa-solid fa-pen" onclick="editVinyl('${v._id}')" aria-label="Modifier" role="button" tabindex="0"></i>
          <i class="fa-solid fa-trash" onclick="deleteVinyl('${v._id}')" aria-label="Supprimer" role="button" tabindex="0"></i>
        </div>
      </div>
    </div>
  `).join("");
}

/* =========================
   REFRESH
========================= */
function refresh() {
  render(getDisplayedVinyls());
}

/* =========================
   POCHETTE (recherche auto iTunes)
========================= */
async function fetchCoverArt(title, artist) {
  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=1`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      // l'API renvoie une petite miniature (100x100), on demande une version plus grande
      return data.results[0].artworkUrl100.replace("100x100bb", "600x600bb");
    }

    return null;
  } catch (err) {
    // pas de connexion, API indisponible... on continue sans bloquer l'ajout
    return null;
  }
}

function handleCoverError(img) {
  img.parentElement.innerHTML = '<i class="fa-solid fa-record-vinyl"></i>';
}
async function addVinyl() {
  const title = document.getElementById("title").value.trim();
  const artist = document.getElementById("artist").value.trim();
  const yearValue = document.getElementById("year").value.trim();
  const genre = getSelectedGenre();
  const manualCover = document.getElementById("coverUrl").value.trim();

  const year = yearValue ? Number(yearValue) : null;
  const currentYear = new Date().getFullYear();

  /* VALIDATION */
  if (!title || !artist) {
    showToast("Titre et artiste sont obligatoires");
    return;
  }

  if (year !== null && (!Number.isInteger(year) || year < 1948 || year > currentYear)) {
    showToast(`Année entre 1948 et ${currentYear}`);
    return;
  }

  const duplicate = vinylsData.some(v =>
    v.title.toLowerCase() === title.toLowerCase() &&
    v.artist.toLowerCase() === artist.toLowerCase() &&
    v._id !== editingId
  );

  if (duplicate) {
    showToast("Ce vinyle existe déjà");
    return;
  }

  /* POCHETTE */
  let cover;

  if (manualCover) {
    // priorité à l'URL fournie manuellement
    cover = manualCover;
  } else if (editingId) {
    // édition sans nouvelle URL : on garde la pochette existante
    const existing = vinylsData.find(v => v._id === editingId);
    cover = existing ? existing.cover : null;
  } else {
    // nouvel ajout sans URL manuelle : recherche automatique
    cover = await fetchCoverArt(title, artist);
  }

  const vinylData = { title, artist, year, genre, cover };

  /* EDIT */
  if (editingId) {
    if (MODE === "demo") {
      const index = vinylsData.findIndex(v => v._id === editingId);
      if (index !== -1) vinylsData[index] = { ...vinylsData[index], ...vinylData };

      editingId = null;
      resetUI();
      refresh();
      showToast("Vinyle modifié !");
      return;
    }

    await fetch(`${API}/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(vinylData)
    });

    editingId = null;
    resetUI();
    loadVinyls();
    showToast("Vinyle modifié !");
    return;
  }

  /* ADD */
  if (MODE === "demo") {
    vinylsData.push({ ...vinylData, _id: Date.now().toString() });
    resetUI();
    refresh();
    showToast("Vinyle ajouté !");
    return;
  }

  await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify(vinylData)
  });

  resetUI();
  loadVinyls();
  showToast("Vinyle ajouté !");
}

/* =========================
   SEARCH
========================= */
function searchVinyls() {
  refresh();
}

function clearSearchField() {
  clearSearch();
  refresh();
}

/* =========================
   DELETE (avec modale de confirmation custom)
========================= */
function deleteVinyl(id) {
  const vinyl = vinylsData.find(v => v._id === id);
  if (!vinyl) return;

  pendingDeleteId = id;

  document.getElementById("deleteModalText").textContent =
    `"${vinyl.title}" — ${vinyl.artist}`;

  document.getElementById("deleteModal").classList.add("show");
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById("deleteModal").classList.remove("show");
}

// clic en dehors de la boîte = fermeture
document.getElementById("deleteModal").addEventListener("click", (e) => {
  if (e.target.id === "deleteModal") {
    closeDeleteModal();
  }
});

// touche Echap = fermeture
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDeleteModal();
  }
});

function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;

  if (MODE === "demo") {
    vinylsData = vinylsData.filter(v => v._id !== id);
    closeDeleteModal();
    resetUI();
    refresh();
    showToast("Vinyle supprimé !");
    return;
  }

  // mode réel : à brancher sur ta route DELETE
  fetch(`${API}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token
    }
  }).then(() => {
    closeDeleteModal();
    resetUI();
    loadVinyls();
    showToast("Vinyle supprimé !");
  });
}

/* =========================
   SORT
========================= */
function sortVinyls(criteria) {
  if (sortState.criteria === criteria) {
    sortState.direction *= -1;
  } else {
    sortState.criteria = criteria;
    sortState.direction = 1;
  }

  refresh();
}

/* =========================
   EDIT MODE
========================= */
function editVinyl(id) {
  const vinyl = vinylsData.find(v => v._id === id);
  if (!vinyl) return;

  document.getElementById("title").value = vinyl.title || "";
  document.getElementById("artist").value = vinyl.artist || "";
  document.getElementById("year").value = vinyl.year || "";
  document.getElementById("coverUrl").value = vinyl.cover || "";

  const genreSelect = document.getElementById("genre");
  const genreOther = document.getElementById("genreOther");
  const knownGenres = Array.from(genreSelect.options).map(o => o.value);

  if (vinyl.genre && knownGenres.includes(vinyl.genre)) {
    genreSelect.value = vinyl.genre;
    genreOther.style.display = "none";
  } else if (vinyl.genre) {
    // genre existant mais pas dans la liste prédéfinie
    genreSelect.value = "Autre";
    genreOther.value = vinyl.genre;
    genreOther.style.display = "block";
  } else {
    genreSelect.value = "";
    genreOther.style.display = "none";
  }

  editingId = id;

  document.getElementById("formTitle").textContent = "Modifier le vinyle";
  document.getElementById("submitBtn").innerHTML = "Enregistrer";
  document.getElementById("cancelBtn").style.display = "block";
}

/* =========================
   CANCEL EDIT
========================= */
function cancelEdit() {
  editingId = null;
  clearForm();

  document.getElementById("formTitle").textContent = "Ajouter un vinyle";
  document.getElementById("submitBtn").innerHTML = "Ajouter";
  document.getElementById("cancelBtn").style.display = "none";
}