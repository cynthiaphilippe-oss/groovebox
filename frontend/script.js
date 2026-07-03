const API_BASE = "http://localhost:3000";
const VINYLS_API = `${API_BASE}/vinyls`;
const USERS_API = `${API_BASE}/users`;

/* =========================
   STATE GLOBAL
========================= */
let token = localStorage.getItem("groovebox_token") || "";
let vinylsData = [];
let editingId = null;
let pendingDeleteId = null;

let authMode = "login"; // "login" ou "signup"

let sortState = {
  criteria: null,
  direction: 1
};

/* =========================
   INIT — vérifie si on est déjà connecté
========================= */
if (token) {
  showApp();
  loadVinyls();
} else {
  showAuth();
}

const yearInput = document.getElementById("year");
if (yearInput) {
  yearInput.max = new Date().getFullYear();
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

function clearSearch() {
  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.value = "";
}

function resetUI() {
  clearForm();
  clearSearch();
}

/* =========================
   AUTHENTIFICATION
========================= */
function showAuth() {
  document.getElementById("authSection").style.display = "flex";
  document.getElementById("appContent").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";
}

function showApp() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("appContent").style.display = "block";
  document.getElementById("logoutBtn").style.display = "block";
}

function toggleAuthMode() {
  authMode = authMode === "login" ? "signup" : "login";

  const usernameField = document.getElementById("authUsername");
  const title = document.getElementById("authTitle");
  const submitBtn = document.getElementById("authSubmitBtn");
  const toggleText = document.getElementById("authToggleText");

  if (authMode === "signup") {
    usernameField.style.display = "block";
    title.textContent = "Inscription";
    submitBtn.textContent = "Créer mon compte";
    toggleText.textContent = "Déjà un compte ? Connecte-toi";
  } else {
    usernameField.style.display = "none";
    title.textContent = "Connexion";
    submitBtn.textContent = "Se connecter";
    toggleText.textContent = "Pas encore de compte ? Inscris-toi";
  }
}

function handleAuthSubmit() {
  if (authMode === "signup") {
    signupUser();
  } else {
    loginUser();
  }
}

async function loginUser() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!email || !password) {
    showToast("Email et mot de passe requis");
    return;
  }

  try {
    const res = await fetch(`${USERS_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Connexion impossible");
      return;
    }

    token = data.token;
    localStorage.setItem("groovebox_token", token);
    localStorage.setItem("groovebox_username", data.user.username);

    document.getElementById("authEmail").value = "";
    document.getElementById("authPassword").value = "";

    showApp();
    loadVinyls();
    showToast(`Bienvenue ${data.user.username} !`);

  } catch (error) {
    showToast("Impossible de contacter le serveur");
  }
}

async function signupUser() {
  const username = document.getElementById("authUsername").value.trim();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!username || !email || !password) {
    showToast("Tous les champs sont requis");
    return;
  }

  try {
    const res = await fetch(`${USERS_API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Inscription impossible");
      return;
    }

    showToast("Compte créé ! Tu peux te connecter.");
    document.getElementById("authPassword").value = "";
    toggleAuthMode(); // repasse en mode connexion

  } catch (error) {
    showToast("Impossible de contacter le serveur");
  }
}

function logout() {
  token = "";
  vinylsData = [];
  localStorage.removeItem("groovebox_token");
  localStorage.removeItem("groovebox_username");
  showAuth();
  showToast("Déconnecté");
}

/* =========================
   LOAD API
========================= */
async function loadVinyls() {
  try {
    const res = await fetch(VINYLS_API, {
      headers: { Authorization: "Bearer " + token }
    });

    if (res.status === 401) {
      // token expiré ou invalide
      logout();
      showToast("Session expirée, reconnecte-toi");
      return;
    }

    vinylsData = await res.json();
    refresh();

  } catch (error) {
    showToast("Impossible de charger la collection");
  }
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

  const search = document.getElementById("search")?.value.toLowerCase() || "";

  if (search) {
    list = list.filter(v =>
      v.artist.toLowerCase().includes(search) ||
      v.title.toLowerCase().includes(search)
    );
  }

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
      return data.results[0].artworkUrl100.replace("100x100bb", "600x600bb");
    }

    return null;
  } catch (err) {
    return null;
  }
}

function handleCoverError(img) {
  img.parentElement.innerHTML = '<i class="fa-solid fa-record-vinyl"></i>';
}

/* =========================
   GENRE (select + champ "Autre")
========================= */
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

/* =========================
   ADD / EDIT VINYL
========================= */
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
    cover = manualCover;
  } else if (editingId) {
    const existing = vinylsData.find(v => v._id === editingId);
    cover = existing ? existing.cover : null;
  } else {
    cover = await fetchCoverArt(title, artist);
  }

  const vinylData = { title, artist, year, genre, cover };

  try {
    if (editingId) {
      /* EDIT */
      const res = await fetch(`${VINYLS_API}/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(vinylData)
      });

      if (!res.ok) throw new Error("Erreur lors de la modification");

      editingId = null;
      resetUI();
      await loadVinyls();
      showToast("Vinyle modifié !");

    } else {
      /* ADD */
      const res = await fetch(VINYLS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(vinylData)
      });

      if (!res.ok) throw new Error("Erreur lors de l'ajout");

      resetUI();
      await loadVinyls();
      showToast("Vinyle ajouté !");
    }
  } catch (error) {
    showToast("Une erreur est survenue, réessaie");
  }
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

document.getElementById("deleteModal").addEventListener("click", (e) => {
  if (e.target.id === "deleteModal") {
    closeDeleteModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDeleteModal();
  }
});

async function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;

  try {
    const res = await fetch(`${VINYLS_API}/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) throw new Error("Erreur lors de la suppression");

    closeDeleteModal();
    resetUI();
    await loadVinyls();
    showToast("Vinyle supprimé !");

  } catch (error) {
    showToast("Impossible de supprimer ce vinyle");
  }
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

  document.querySelector(".form").scrollIntoView({ behavior: "smooth" });
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