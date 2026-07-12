const API_BASE = "https://groovebox.onrender.com";
const VINYLS_API = `${API_BASE}/vinyls`;
const USERS_API = `${API_BASE}/users`;

// enregistrement du service worker (rend l'appli installable)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // pas grave si ça échoue, l'appli fonctionne quand même normalement
    });
  });
}

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
  updateNavActive("collection");
} else {
  showAuth();
}

const yearInput = document.getElementById("year");
if (yearInput) {
  yearInput.max = new Date().getFullYear();
}

/* =========================
   BOTTOM SHEETS (nav mobile)
========================= */
function openSheet(name) {
  closeSheets();

  const el = name === "add"
    ? document.getElementById("vinylFormSection")
    : document.getElementById("searchSection");

  el.classList.add("sheet-open");
  document.getElementById("sheetBackdrop").classList.add("show");
  updateNavActive(name);
}

function closeSheets() {
  document.getElementById("vinylFormSection").classList.remove("sheet-open");
  document.getElementById("searchSection").classList.remove("sheet-open");
  document.getElementById("sheetBackdrop").classList.remove("show");
  updateNavActive("collection");
}

function updateNavActive(name) {
  document.querySelectorAll("#bottomNav button").forEach(b => b.classList.remove("active-nav"));
  const btn = document.getElementById(`navBtn-${name}`);
  if (btn) btn.classList.add("active-nav");
}

/* =========================
   MENU BURGER (desktop)
========================= */
function toggleDesktopMenu(event) {
  event.stopPropagation();
  document.getElementById("desktopMenu").classList.toggle("show");
}

function openSheetFromMenu(name) {
  document.getElementById("desktopMenu").classList.remove("show");
  openSheet(name);
}

// ferme le menu si on clique n'importe où ailleurs
document.addEventListener("click", (e) => {
  const menu = document.getElementById("desktopMenu");
  const btn = document.getElementById("desktopMenuBtn");
  if (menu && menu.classList.contains("show") && !menu.contains(e.target) && e.target !== btn) {
    menu.classList.remove("show");
  }
});

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
  resetCoverPicker();
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
  document.getElementById("desktopMenuWrapper").style.display = "none";
}

function showApp() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("appContent").style.display = "block";
  document.getElementById("logoutBtn").style.display = "block";
  document.getElementById("desktopMenuWrapper").style.display = "";
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
    updateNavActive("collection");
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
  showLoading();

  try {
    const res = await fetch(VINYLS_API, {
      headers: { Authorization: "Bearer " + token }
    });

    if (res.status === 401) {
      logout();
      showToast("Session expirée, reconnecte-toi");
      return;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      vinylsData = [];
      document.getElementById("list").innerHTML = `
        <p class="empty-state">Erreur serveur : ${errData.message || "impossible de charger la collection"} 😕</p>
      `;
      showToast("Erreur lors du chargement de la collection");
      return;
    }

    vinylsData = await res.json();
    refresh();

  } catch (error) {
    vinylsData = [];
    showToast("Impossible de contacter le serveur");
    document.getElementById("list").innerHTML = `
      <p class="empty-state">Impossible de charger la collection 😕</p>
    `;
  }
}

function showLoading() {
  document.getElementById("list").innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Chargement de la collection...</p>
    </div>
  `;
}

/* =========================
   RESET ORDRE (bouton dédié)
========================= */
function resetOrder() {
  sortState.criteria = null;
  sortState.direction = 1;
  updateSortButtonsUI();
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
   COULEUR DE BADGE PAR GENRE
========================= */
const GENRE_COLORS = {
  "Rock": { bg: "#e74c3c", text: "#fff" },
  "Pop": { bg: "#e75480", text: "#fff" },
  "Jazz": { bg: "#9b59b6", text: "#fff" },
  "Blues": { bg: "#3498db", text: "#fff" },
  "Funk": { bg: "#f1c40f", text: "#111" },
  "Soul": { bg: "#e67e22", text: "#111" },
  "Electro": { bg: "#8e44ad", text: "#fff" },
  "Hip-Hop": { bg: "#2b2b2b", text: "#fff", border: "#f8eedc" },
  "Rap": { bg: "#161616", text: "#fff", border: "#ed601a" },
  "Reggae": { bg: "#27ae60", text: "#fff" },
  "Classique": { bg: "#f0f0f0", text: "#111" },
  "Metal": { bg: "#7f8c8d", text: "#111" },
  "Folk": { bg: "#a9784c", text: "#111" },
  "Grunge": { bg: "#556b2f", text: "#fff" },
  "Progressive Rock": { bg: "#1f3a93", text: "#fff" },
  "Punk": { bg: "#ff5722", text: "#fff" },
  "Disco": { bg: "#d4af37", text: "#111" },
  "Country": { bg: "#6f4518", text: "#fff" },
  "World": { bg: "#16a085", text: "#fff" },
  "OST": { bg: "#7d1128", text: "#fff" },
};

function genreColor(genre) {
  if (!genre) return { bg: "#ed601a", text: "#fff" };

  if (GENRE_COLORS[genre]) return GENRE_COLORS[genre];

  // genre personnalisé (via "Autre") : couleur générée mais cohérente à chaque fois
  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = genre.toLowerCase().charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue}, 62%, 42%)`, text: "#fff" };
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

        ${v.genre ? (() => {
          const c = genreColor(v.genre);
          const borderStyle = c.border ? `border:1px solid ${c.border};` : "";
          return `<span class="badge" style="background:${c.bg};color:${c.text};${borderStyle}">${v.genre}</span>`;
        })() : ""}

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
   POCHETTE (vignettes cliquables)
========================= */
let selectedCover = null;
let coverSearchTimer = null;

function scheduleCoverSearch() {
  clearTimeout(coverSearchTimer);
  coverSearchTimer = setTimeout(triggerCoverSearch, 700);
}

async function triggerCoverSearch() {
  const title = document.getElementById("title").value.trim();
  const artist = document.getElementById("artist").value.trim();
  const picker = document.getElementById("coverPicker");
  const container = document.getElementById("coverResults");

  if (!title || !artist) {
    picker.style.display = "none";
    return;
  }

  picker.style.display = "block";
  container.innerHTML = `<div class="cover-loading">Recherche en cours...</div>`;

  try {
    const query = `title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
    const res = await fetch(`${VINYLS_API}/cover-search?${query}`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) {
      container.innerHTML = `<p class="cover-empty">Recherche indisponible pour le moment</p>`;
      return;
    }

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      container.innerHTML = `<p class="cover-empty">Aucune pochette trouvée — tu peux coller une URL en dessous</p>`;
      return;
    }

    container.innerHTML = data.results.map(r => `
      <img
        src="${r.cover}"
        alt="${r.album}"
        title="${r.album} — ${r.artist}"
        class="cover-option"
        onclick="selectCover('${r.cover}', this)"
        onerror="this.remove()"
      >
    `).join("");

  } catch (err) {
    container.innerHTML = `<p class="cover-empty">Recherche indisponible pour le moment</p>`;
  }
}

function selectCover(url, imgEl) {
  selectedCover = url;
  document.querySelectorAll(".cover-option").forEach(el => el.classList.remove("selected"));
  imgEl.classList.add("selected");
}

function resetCoverPicker() {
  selectedCover = null;
  document.getElementById("coverPicker").style.display = "none";
  document.getElementById("coverResults").innerHTML = "";
}

/* =========================
   PHOTO DEPUIS L'APPAREIL (mobile)
========================= */
function handleCameraCapture(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();

    img.onload = () => {
      // on redimensionne et compresse pour ne pas stocker des photos énormes
      const maxSize = 500;
      let { width, height } = img;

      if (width > height && width > maxSize) {
        height = height * (maxSize / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = width * (maxSize / height);
        height = maxSize;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      addCameraShotToResults(dataUrl);
      showToast("Photo prête !");
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
  event.target.value = ""; // permet de reprendre une photo derrière si besoin
}

function addCameraShotToResults(dataUrl) {
  const picker = document.getElementById("coverPicker");
  const container = document.getElementById("coverResults");

  picker.style.display = "block";

  // enlève le message vide/chargement s'il y en avait un
  const placeholder = container.querySelector(".cover-empty, .cover-loading");
  if (placeholder) placeholder.remove();

  // remplace une éventuelle photo précédemment prise
  const existingShot = container.querySelector(".camera-shot");
  if (existingShot) existingShot.remove();

  const img = document.createElement("img");
  img.src = dataUrl;
  img.title = "Ta photo";
  img.className = "cover-option camera-shot";
  img.onclick = () => selectCover(dataUrl, img);

  container.prepend(img);
  selectCover(dataUrl, img);
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
  } else if (selectedCover) {
    cover = selectedCover;
  } else if (editingId) {
    const existing = vinylsData.find(v => v._id === editingId);
    cover = existing ? existing.cover : null;
  } else {
    cover = null;
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
      closeSheets();
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
      closeSheets();
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
const sortLabels = { title: "A → Z", artist: "Artiste", year: "Année", genre: "Genre" };

function updateSortButtonsUI() {
  Object.keys(sortLabels).forEach(key => {
    const btn = document.getElementById(`sortBtn-${key}`);
    if (!btn) return;
    btn.classList.remove("active");
    btn.textContent = sortLabels[key];
  });

  if (sortState.criteria) {
    const btn = document.getElementById(`sortBtn-${sortState.criteria}`);
    if (btn) {
      btn.classList.add("active");
      const arrow = sortState.direction === 1 ? "↑" : "↓";
      btn.textContent = `${sortLabels[sortState.criteria]} ${arrow}`;
    }
  }
}

function sortVinyls(criteria) {
  if (sortState.criteria === criteria) {
    sortState.direction *= -1;
  } else {
    sortState.criteria = criteria;
    sortState.direction = 1;
  }

  updateSortButtonsUI();
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

  openSheet("add");
  document.getElementById("vinylFormSection").scrollIntoView({ behavior: "smooth" });
}

/* =========================
   CANCEL EDIT
========================= */
function cancelEdit() {
  editingId = null;
  clearForm();
  closeSheets();

  document.getElementById("formTitle").textContent = "Ajouter un vinyle";
  document.getElementById("submitBtn").innerHTML = "Ajouter";
  document.getElementById("cancelBtn").style.display = "none";
}
