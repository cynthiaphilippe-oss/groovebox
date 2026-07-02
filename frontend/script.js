const API = "http://localhost:3000/vinyls";
const MODE = "demo";

/* =========================
   STATE GLOBAL
========================= */
let token = "";
let vinylsData = [];
let lastDisplayed = [];

let sortState = {
  criteria: null,
  direction: 1 // 1 = A→Z / ↑ / ancien→récent
};

let editingId = null; // null = mode ajout, sinon id du vinyle en cours de modification

let sortUI = {
  title: "A → Z",
  artist: "A → Z",
  year: "A → Z"
};
/* =========================
   INIT DEMO
========================= */
if (MODE === "demo") {
  vinylsData = [
    { _id: "1", title: "Thriller", artist: "Michael Jackson", year: 1982, genre: "Pop" },
    { _id: "2", title: "Nevermind", artist: "Nirvana", year: 1991, genre: "Grunge" },
    { _id: "3", title: "Random Access Memories", artist: "Daft Punk", year: 2013, genre: "Electro" }
  ];

  refresh();
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
   SOURCE UNIQUE AFFICHAGE
========================= */
function getDisplayedVinyls() {
  let list = [...vinylsData];

  // SEARCH
  const searchInput = document.getElementById("search");
  const search = searchInput ? searchInput.value.toLowerCase() : "";

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

      const valA = (a[sortState.criteria] || "").toString().toLowerCase();
      const valB = (b[sortState.criteria] || "").toString().toLowerCase();

      return sortState.direction * ((a[sortState.criteria] || "").toString().localeCompare((b[sortState.criteria] || "").toString()
      ));
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

  list.innerHTML = vinyls.map(v => `
    <div class="card">
      <div class="cover">
        <i class="fa-solid fa-record-vinyl"></i>
      </div>

      <div class="infos">
        <h3>${v.title}</h3>
        <p class="artist">${v.artist}</p>

        <div class="details">
          <span>${v.year || "-"}</span>
        </div>

        ${v.genre ? `<span class="badge">${v.genre}</span>` : ""}

        <!-- 🔥 ICI LES ICÔNES -->
        <div class="actions">
          <i class="fa-solid fa-pen" onclick="editVinyl('${v._id}')"></i>
          <i class="fa-solid fa-trash" onclick="deleteVinyl('${v._id}')"></i>
        </div>
      </div>
    </div>
  `).join("");
}

/* =========================
   REFRESH CENTRAL
========================= */
function refresh() {
  render(getDisplayedVinyls());
}

/* =========================
   ADD VINYL
========================= */
async function addVinyl() {
  const title = document.getElementById("title").value.trim();
  const artist = document.getElementById("artist").value.trim();
  const year = Number(document.getElementById("year").value);
  const genre = document.getElementById("genre").value.trim();

  if (!title || !artist) {
    alert("Titre et artiste sont obligatoires");
    return;
  }

  const vinylData = { title, artist, year, genre };

  // ===== MODE MODIFICATION =====
  if (editingId) {

    if (MODE === "demo") {
      const index = vinylsData.findIndex(v => v._id === editingId);
      if (index !== -1) {
        vinylsData[index] = { ...vinylsData[index], ...vinylData };
      }
      cancelEdit();
      refresh();
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

    cancelEdit();
    loadVinyls();
    return;
  }

  // ===== MODE AJOUT =====
  if (MODE === "demo") {
    vinylsData.push({ ...vinylData, _id: Date.now().toString() });
    clearForm();
    refresh();
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

  clearForm();
  loadVinyls();
}

/* =========================
   SEARCH
========================= */
function searchVinyls() {
  refresh();
}

/* =========================
   DELETE
========================= */
function deleteVinyl(id) {
  const vinyl = vinylsData.find(v => v._id === id);
  const label = vinyl ? `"${vinyl.title}" (${vinyl.artist})` : "ce vinyle";

  if (!confirm(`Supprimer ${label} ?`)) return;

  if (MODE === "demo") {
    vinylsData = vinylsData.filter(v => v._id !== id);
    refresh();
    return;
  }

  alert("Suppression backend à brancher");
}

/* =========================
   SORT (A→Z / Z→A OK)
========================= */
function sortVinyls(criteria) {

  // toggle logique
  if (sortState.criteria === criteria) {
    sortState.direction *= -1;
  } else {
    sortState.criteria = criteria;
    sortState.direction = 1;
  }

  // 👇 on ne trie plus ici : refresh() appelle getDisplayedVinyls()
  // qui applique recherche + tri ensemble, sur la même source
  refresh();
}

/* =========================
   EDIT
========================= */
function editVinyl(id) {
  const vinyl = vinylsData.find(v => v._id === id);
  if (!vinyl) return;

  // on préremplit le formulaire avec les infos existantes
  document.getElementById("title").value = vinyl.title || "";
  document.getElementById("artist").value = vinyl.artist || "";
  document.getElementById("year").value = vinyl.year || "";
  document.getElementById("genre").value = vinyl.genre || "";

  editingId = id;

  // bascule visuelle : formulaire en mode "modification"
  document.getElementById("formTitle").textContent = "Modifier le vinyle";
  document.getElementById("submitBtn").innerHTML = '<i class="fa-solid fa-check"></i> Enregistrer les modifications';
  document.getElementById("cancelBtn").style.display = "block";

  // on scroll jusqu'au formulaire pour que ce soit clair
  document.querySelector(".form").scrollIntoView({ behavior: "smooth" });
}

function cancelEdit() {
  editingId = null;
  clearForm();

  document.getElementById("formTitle").textContent = "Ajouter un vinyle";
  document.getElementById("submitBtn").innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter';
  document.getElementById("cancelBtn").style.display = "none";
}

function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("artist").value = "";
  document.getElementById("year").value = "";
  document.getElementById("genre").value = "";
}