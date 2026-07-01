const API = "http://localhost:3000/vinyls";

let token = "";

// sauvegarde token
function saveToken() {
  token = document.getElementById("tokenInput").value;
  alert("Token enregistré !");
}

// charge les vinyles de l'utilisateur
async function loadVinyls() {
  const res = await fetch(API, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await res.json();
  display(data);
}

// recherche les vinyles de l'utilisateur
function display(vinyls) {
  const list = document.getElementById("list");
  list.innerHTML = "";

  vinyls.forEach(v => {
    list.innerHTML += `
      <div class="card">
        <h3>${v.title}</h3>
        <p>${v.artist}</p>
        <p>${v.year || ""}</p>
        <p>${v.genre || ""}</p>
      </div>
    `;
  });
}


// ajoute un vinyle
async function addVinyl() {
  const title = document.getElementById("title").value;
  const artist = document.getElementById("artist").value;
  const year = document.getElementById("year").value;
  const genre = document.getElementById("genre").value;

  await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ title, artist, year, genre })
  });

  loadVinyls();
}

// recherche les vinyles de l'utilisateur
async function searchVinyls() {
  const artist = document.getElementById("search").value;

  const res = await fetch(`${API}/search?artist=${artist}`, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await res.json();
  display(data);
}