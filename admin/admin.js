// StudentHome - Admin Dashboard Script

/* Extracted from admin.html */
function setAdminLoading(isLoading) {
  const loadingEl = document.getElementById("admin-loading");
  const tableWrap = document.querySelector(".listings-table-container");
  const cardsWrap = document.getElementById("listings-cards");
  if (loadingEl) loadingEl.style.display = isLoading ? "grid" : "none";
  if (tableWrap) tableWrap.style.display = isLoading ? "none" : "";
  if (cardsWrap) cardsWrap.style.display = isLoading ? "none" : "";
}

function renderDashboard(filter = "") {
  const allListings = window.getListings();
  const listings = allListings.filter(
    (l) =>
      l.title.toLowerCase().includes(filter.toLowerCase()) ||
      l.location.toLowerCase().includes(filter.toLowerCase()),
  );

  document.getElementById("prop-count").textContent = allListings.length;
  document.getElementById("active-count").textContent = allListings.filter(
    (h) => h.status === "Active",
  ).length;

  const unis = window.CLOUD_UNIVERSITIES_DATA || [];
  const uniCountEl = document.getElementById("uni-count");
  if (uniCountEl) uniCountEl.textContent = unis.length;
  if (window.renderUniversities) window.renderUniversities();

  const body = document.getElementById("listings-body");
  const cards = document.getElementById("listings-cards");

  if (listings.length === 0) {
    body.innerHTML =
      '<tr><td colspan="4" style="text-align:center; padding:3rem; color:var(--muted);">No results found</td></tr>';
    cards.innerHTML =
      '<p style="text-align:center; padding:2rem; color:var(--muted);">No results found</p>';
  } else {
    const rowsHtml = listings
      .map(
        (l) => `
          <tr>
            <td>
              <div class="property-cell">
                <img src="${l.photo || (l.photos && l.photos[0]) || ""}" class="property-thumb" alt="">
                <div class="property-info">
                  <h4>${l.title}</h4>
                  <p>${l.location}</p>
                </div>
              </div>
            </td>
            <td>₦${l.price.toLocaleString()}</td>
            <td><span class="status ${l.status.toLowerCase()}">${l.status}</span></td>
            <td>
              <div class="actions">
                <button class="btn btn-small" style="background: rgba(255,255,255,0.1); color:white;" onclick="toggleStatus(${l.id}, '${l.status}')">${l.status === "Active" ? "Hide" : "Show"}</button>
                <button class="btn btn-small btn-edit" onclick="window.location.href='../admin-form/admin-form.html?edit=${l.id}'">Edit</button>
                <button class="btn btn-small btn-delete" onclick="handleDelete(${l.id})">Delete</button>
              </div>
            </td>
          </tr>
        `,
      )
      .join("");

    const cardsHtml = listings
      .map(
        (l) => `
          <div class="listing-card">
            <img src="${l.photo || (l.photos && l.photos[0]) || ""}" alt="">
            <div class="listing-card-content">
              <h4>${l.title}</h4>
              <p>${l.location}</p>
              <div style="font-weight:700; color:var(--accent); margin-bottom:1rem;">₦${l.price.toLocaleString()}</div>
              <div class="listing-card-actions">
                <button class="btn btn-small" style="flex:1; background: rgba(255,255,255,0.1); color:white;" onclick="toggleStatus(${l.id}, '${l.status}')">${l.status === "Active" ? "Hide" : "Show"}</button>
                <button class="btn btn-small btn-edit" style="flex:1;" onclick="window.location.href='../admin-form/admin-form.html?edit=${l.id}'">Edit</button>
                <button class="btn btn-small btn-delete" style="flex:1;" onclick="handleDelete(${l.id})">Delete</button>
              </div>
            </div>
          </div>
        `,
      )
      .join("");

    body.innerHTML = rowsHtml;
    cards.innerHTML = cardsHtml;
  }
}
window.renderDashboard = renderDashboard;

async function toggleStatus(id, currentStatus) {
  if (confirm("Toggle visibility for this property?")) {
    const newStatus = currentStatus === "Active" ? "Hidden" : "Active";
    const res = await window.updateListing({ id, status: newStatus });
    if (!res.success) alert("Error toggling: " + res.error?.message);
    if (window.fetchAllData) await window.fetchAllData();
    renderDashboard(document.getElementById("admin-search").value);
  }
}

async function handleDelete(id) {
  if (confirm("Delete this listing permanently?")) {
    const res = await window.deleteListing(id);
    if (!res.success) alert("Delete Error: " + res.error?.message);
    if (window.fetchAllData) await window.fetchAllData();
    renderDashboard(document.getElementById("admin-search").value);
  }
}

// Exposed Functions for HTML onclicks
window.updateUniLogoScale = async (uniId, scale) => {
  // 1. Find the image and label in the DOM immediately for instant feedback
  // Use a more reliable way to find the card
  const allCards = document.querySelectorAll(".uni-card-container");
  let card = null;
  for (const c of allCards) {
    if (c.innerHTML.includes(`updateUniLogoScale(${uniId}`)) {
      card = c;
      break;
    }
  }

  if (card) {
    const img = card.querySelector("img");
    const label = card.querySelector("label");
    if (img) img.style.transform = `scale(${scale})`;
    if (label) label.textContent = `Logo Size: ${scale}x`;
  }

  // 2. Persist to DB in the background
  if (window.updateUniversityLogoScale) {
    const res = await window.updateUniversityLogoScale(uniId, scale);
    if (!res?.success) {
      console.error("DB Update Failed:", res?.error);
    }
  }
};

window.triggerUniLogoUpload = (uniId) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file && window.uploadPhotoToStorage && window.updateUniversityLogo) {
      const url = await window.uploadPhotoToStorage(file);
      if (url) {
        await window.updateUniversityLogo(uniId, url);
        if (window.fetchAllData) await window.fetchAllData();
      }
    }
  };
  input.click();
};

window.removeUniversity = async (uniId) => {
  if (
    !confirm(
      "Are you sure you want to remove this university and all its areas?",
    )
  )
    return;
  if (window.sb_client) {
    const { error } = await window.sb_client
      .from("universities")
      .delete()
      .eq("id", uniId);
    if (!error) {
      if (window.fetchAllData) await window.fetchAllData();
    } else {
      alert("Error removing university: " + error.message);
    }
  }
};

window.addAreaToUni = async (uniId) => {
  const area = prompt("Enter new area name:");
  if (!area) return;

  if (window.sb_client) {
    // First get current areas
    const { data } = await window.sb_client
      .from("universities")
      .select("locations")
      .eq("id", uniId)
      .single();
    const currentAreas = data?.locations || [];
    if (currentAreas.includes(area)) {
      alert("Area already exists!");
      return;
    }

    const { error } = await window.sb_client
      .from("universities")
      .update({
        locations: [...currentAreas, area],
      })
      .eq("id", uniId);

    if (!error) {
      if (window.fetchAllData) await window.fetchAllData();
    }
  }
};

window.removeAreaFromUni = async (uniId, areaName) => {
  if (!confirm(`Remove "${areaName}"?`)) return;
  if (window.sb_client) {
    const { data } = await window.sb_client
      .from("universities")
      .select("locations")
      .eq("id", uniId)
      .single();
    const currentAreas = data?.locations || [];
    const updatedAreas = currentAreas.filter((a) => a !== areaName);

    const { error } = await window.sb_client
      .from("universities")
      .update({
        locations: updatedAreas,
      })
      .eq("id", uniId);

    if (!error) {
      if (window.fetchAllData) await window.fetchAllData();
    }
  }
};

window.addNewUniversity = async () => {
  const name = prompt("Enter University Name:");
  if (!name) return;

  if (window.sb_client) {
    const { error } = await window.sb_client.from("universities").insert([
      {
        name: name,
        locations: [],
        logo_url: "",
        logo_scale: 1.1,
      },
    ]);

    if (!error) {
      if (window.fetchAllData) await window.fetchAllData();
    } else {
      alert("Error adding university: " + error.message);
    }
  }
};

window.renderUniversities = () => {
  const uniCards = document.getElementById("uni-cards");
  if (!uniCards) return;

  const unis = window.CLOUD_UNIVERSITIES_DATA || [];
  if (unis.length === 0) {
    uniCards.innerHTML = '<p class="muted">No universities found.</p>';
    return;
  }

  uniCards.innerHTML = unis.map(u => `
        <div class="uni-card-container" style="background:var(--bg-panel); border:1px solid var(--card-border); padding:1.5rem; border-radius:16px; display:flex; flex-direction:column; gap:1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="display:flex; flex-direction:column; align-items:center; gap:1rem;">
                <div style="width:140px; height:140px; display:flex; align-items:center; justify-content:center; overflow:hidden; border:1px dashed var(--card-border); border-radius:12px; background:rgba(255,255,255,0.02); position:relative;">
                    <img src="${u.logo_url || "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?q=80&w=200&auto=format&fit=crop"}" 
                         style="width:100%; height:100%; object-fit:contain; transform: scale(${u.logo_scale || 1.1}); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3)); transition: transform 0.1s ease-out;">
                </div>
                <div style="text-align:center; width:100%;">
                    <h4 style="margin-bottom:0.3rem; color:white; font-size:1.1rem;">${u.name}</h4>
                    <div style="display:flex; gap:0.5rem; justify-content:center;">
                        <button class="btn btn-small" style="font-size:0.7rem; padding:0.3rem 0.6rem;" onclick="triggerUniLogoUpload(${u.id})">Upload Logo</button>
                        <button class="btn btn-small" style="font-size:0.7rem; padding:0.3rem 0.6rem; background:rgba(239, 68, 68, 0.1); color:#ef4444; border-color:rgba(239, 68, 68, 0.2);" onclick="removeUniversity(${u.id})">Delete</button>
                    </div>
                </div>
            </div>

            <div style="padding:0.5rem; background:rgba(0,0,0,0.2); border-radius:8px;">
                <label style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:0.3rem;">Logo Size: ${u.logo_scale || 1.1}x</label>
                <input type="range" min="0.5" max="3" step="0.1" value="${u.logo_scale || 1.1}" 
                       style="width:100%; accent-color:var(--accent); cursor:pointer;"
                       oninput="updateUniLogoScale(${u.id}, this.value)">
            </div>

            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">AREAS</span>
                    <button onclick="addAreaToUni(${u.id})" style="background:var(--accent); color:black; border:none; border-radius:4px; width:20px; height:20px; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;">+</button>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                    ${(u.locations || [])
                      .map(
                        (area) => `
                        <span style="font-size:0.7rem; background:rgba(255,255,255,0.05); padding:0.2rem 0.5rem; border-radius:4px; color:var(--text-muted); display:flex; align-items:center; gap:4px; border:1px solid rgba(255,255,255,0.1);">
                            ${area}
                            <span onclick="removeAreaFromUni(${u.id}, '${area}')" style="cursor:pointer; color:#ef4444; font-weight:bold; font-size:0.8rem;">×</span>
                        </span>
                    `,
                      )
                      .join("")}
                    ${!u.locations?.length ? '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">No areas added</span>' : ""}
                </div>
            </div>
        </div>
    `,
    )
    .join("");
};

document.getElementById("admin-search").addEventListener("input", (e) => {
  renderDashboard(e.target.value);
});

document.addEventListener("DOMContentLoaded", async () => {
  const isAdmin = await window.ensureAdminAccess();
  if (!isAdmin) return;
  setAdminLoading(true);
  if (window.fetchAllData) await window.fetchAllData();
  setAdminLoading(false);
  renderDashboard();
  renderUniversities();
});
