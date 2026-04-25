// StudentHome - Admin Dashboard Script (Premium v2.0)

function setAdminLoading(isLoading) {
  const loadingEl = document.getElementById("admin-loading");
  const tableWrap = document.querySelector(".listings-table-container");
  const uniLoadingEl = document.getElementById("uni-loading");
  const uniCardsEl = document.getElementById("uni-cards");

  if (loadingEl) loadingEl.style.display = isLoading ? "flex" : "none";
  if (tableWrap) tableWrap.style.display = isLoading ? "none" : "";

  if (uniLoadingEl) uniLoadingEl.style.display = isLoading ? "flex" : "none";
  if (uniCardsEl)
    uniCardsEl.style.display = isLoading ? "none" : "grid";
}

async function waitForHousesReady({ timeoutMs = 8000 } = {}) {
  if (window.hasFetchedHouses) return true;
  const start = Date.now();
  return await new Promise((resolve) => {
    const tick = () => {
      if (window.hasFetchedHouses) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);
      setTimeout(tick, 120);
    };
    tick();
  });
}

function renderDashboard(filter = "") {
  const allListings = window.getListings();
  const searchText = String(filter || "").toLowerCase();
  const statusFilter = document.getElementById("admin-status-filter")?.value || "all";
  const schoolFilter = document.getElementById("admin-school-filter")?.value || "";
  const typeFilter = document.getElementById("admin-type-filter")?.value || "";
  const sortFilter = document.getElementById("admin-sort-filter")?.value || "newest";

  let listings = allListings.filter((l) => {
    // Text search
    if (searchText) {
      const matchesSearch = 
        String(l.title || "").toLowerCase().includes(searchText) ||
        String(l.location || "").toLowerCase().includes(searchText) ||
        String(l.school || "").toLowerCase().includes(searchText) ||
        String(l.area || "").toLowerCase().includes(searchText);
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && String(l.status || "") !== statusFilter) return false;
    
    // School filter
    if (schoolFilter && String(l.school || "") !== schoolFilter) return false;
    
    // Type filter
    if (typeFilter && String(l.type || "") !== typeFilter) return false;
    
    return true;
  });

  // Apply sorting
  listings.sort((a, b) => {
    switch (sortFilter) {
      case "oldest":
        return (new Date(a.created_at || 0)) - (new Date(b.created_at || 0));
      case "price-high":
        return (b.price || 0) - (a.price || 0);
      case "price-low":
        return (a.price || 0) - (b.price || 0);
      case "name-az":
        return String(a.title || "").localeCompare(String(b.title || ""));
      case "newest":
      default:
        return (new Date(b.created_at || 0)) - (new Date(a.created_at || 0));
    }
  });

  document.getElementById("prop-count").textContent = allListings.length;
  document.getElementById("active-count").textContent = allListings.filter(
    (h) => h.status === "Active",
  ).length;

  const uniCountSource = (window.getUniversities && window.getUniversities()) || window.NIGERIA_UNIVERSITIES || {};
  const uniCountEl = document.getElementById("uni-count");
  if (uniCountEl) uniCountEl.textContent = Object.keys(uniCountSource).length;
  
  if (window.renderUniversities) window.renderUniversities();

  const body = document.getElementById("listings-body");
  if (!body) return;

  if (listings.length === 0) {
    body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:4rem; color:var(--text-muted);">No properties found Matching your filters.</td></tr>';
  } else {
    body.innerHTML = listings
      .map(
        (l) => `
          <tr>
            <td>
              <div class="prop-cell">
                <div class="image-container">
                  <img src="${l.photo || (l.photos && l.photos[0]) || ""}" alt="">
                  <button class="image-remove-btn" onclick="removeImageCard(${l.id})" title="Remove image">×</button>
                </div>
                <div class="prop-titles">
                  <h4>${l.title}</h4>
                  <p>${l.school} • ${l.location}</p>
                </div>
              </div>
            </td>
            <td><div style="font-weight:700;">₦${l.price.toLocaleString()}</div></td>
            <td><span class="status-badge ${l.status.toLowerCase()}">${l.status}</span></td>
            <td>
              <div class="actions">
                <button class="btn-icon" title="Toggle Status" onclick="toggleStatus(${l.id}, '${l.status}')">
                   ${l.status === "Active" ? 
                     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` : 
                     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
                   }
                </button>
                <button class="btn-icon" title="Edit" onclick="window.location.href='../admin-form/admin-form.html?edit=${l.id}'">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-icon delete" title="Delete" onclick="handleDelete(${l.id})">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>
        `,
      )
      .join("");
  }
}
window.renderDashboard = renderDashboard;

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === "Active" ? "Hidden" : "Active";
  const res = await window.updateListing({ id, status: newStatus });
  if (!res.success) alert("Error toggling: " + res.error?.message);
  renderDashboard(document.getElementById("admin-search")?.value);
}
window.toggleStatus = toggleStatus;

async function handleDelete(id) {
  if (confirm("Delete this listing permanently?")) {
    const res = await window.deleteListing(id);
    if (!res.success) alert("Delete Error: " + res.error?.message);
    renderDashboard(document.getElementById("admin-search")?.value);
  }
}
window.handleDelete = handleDelete;

window.removeImageCard = async (id) => {
  if (!confirm("Delete this property from database?")) return;
  const row = event.target.closest('tr');
  if (row) {
    row.style.transition = 'opacity 0.3s ease';
    row.style.opacity = '0';
    await window.deleteListing(id);
    if (window.fetchAllData) await window.fetchAllData();
    setTimeout(() => {
      renderDashboard(document.getElementById("admin-search")?.value || "");
    }, 300);
  }
};

window.updateUniLogoScale = async (uniId, scale) => {
  const card = document.querySelector(`.uni-card[data-id="${uniId}"]`);
  if (card) {
    const img = card.querySelector("img");
    if (img) img.style.transform = `scale(${scale})`;
  }

  if (window.updateUniversityLogoScale) {
    await window.updateUniversityLogoScale(uniId, scale);
  }
};

window.triggerUniLogoUpload = (uniId) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file && window.uploadPhotoToStorage && window.updateUniversityLogo) {
      if (window.showToast) window.showToast("Uploading logo...", "info");
      try {
        const url = await window.uploadPhotoToStorage(file);
        if (url) {
          const res = await window.updateUniversityLogo(uniId, url);
          if (res.success) {
            if (window.showToast) window.showToast("Logo updated!", "success");
            if (window.fetchAllData) await window.fetchAllData();
            renderUniversities();
          }
        }
      } catch (err) {
        console.error("Logo Upload Error:", err);
        if (window.showToast) window.showToast("Upload failed: " + err.message, "error");
      }
    }
  };
  input.click();
};

window.removeUniversity = async (uniId) => {
  if (!confirm("Remove this university and all its areas?")) return;
  if (window.sb_client) {
    const { error } = await window.sb_client.from("universities").delete().eq("id", uniId);
    if (!error) {
       if (window.fetchAllData) await window.fetchAllData();
       renderUniversities();
    }
  }
};

window.addAreaToUni = async (uniId) => {
  const area = prompt("Enter new area name:");
  if (!area) return;
  if (window.sb_client) {
    const { data } = await window.sb_client.from("universities").select("locations").eq("id", uniId).single();
    const currentAreas = data?.locations || [];
    if (currentAreas.includes(area)) return alert("Area already exists!");
    const { error } = await window.sb_client.from("universities").update({ locations: [...currentAreas, area] }).eq("id", uniId);
    if (!error) {
       if (window.fetchAllData) await window.fetchAllData();
       renderUniversities();
    }
  }
};

window.removeAreaFromUni = async (uniId, areaName) => {
  if (!confirm(`Remove "${areaName}"?`)) return;
  if (window.sb_client) {
    const { data } = await window.sb_client.from("universities").select("locations").eq("id", uniId).single();
    const updatedAreas = (data?.locations || []).filter((a) => a !== areaName);
    const { error } = await window.sb_client.from("universities").update({ locations: updatedAreas }).eq("id", uniId);
    if (!error) {
       if (window.fetchAllData) await window.fetchAllData();
       renderUniversities();
    }
  }
};

window.addNewUniversity = async () => {
  const name = prompt("Enter University Name:");
  if (!name) return;
  if (window.sb_client) {
    const { error } = await window.sb_client.from("universities").insert([{ name, locations: [], logo_url: "", logo_scale: 1.1 }]);
    if (!error) {
      if (window.fetchAllData) await window.fetchAllData();
      renderUniversities();
    }
  }
};

window.renderUniversities = () => {
  const uniCards = document.getElementById("uni-cards");
  if (!uniCards) return;

  const cloudUnis = window.CLOUD_UNIVERSITIES_DATA || [];
  if (cloudUnis.length === 0) {
    uniCards.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:3rem;">No university partners added yet.</p>';
    return;
  }

  uniCards.innerHTML = cloudUnis
    .map(
      (u) => `
        <div class="uni-card" data-id="${u.id}">
            <div class="uni-logo-box">
                <img src="${u.logo_url || "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?q=80&w=200&auto=format&fit=crop"}"
                     style="transform: scale(${u.logo_scale || 1.1});">
            </div>
            <h3>${u.name}</h3>
            <div style="display:flex; gap:0.5rem; justify-content:center; margin-bottom:1.5rem;">
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size:0.75rem;" onclick="triggerUniLogoUpload(${u.id})">Update Logo</button>
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size:0.75rem; color:#f43f5e;" onclick="removeUniversity(${u.id})">Delete</button>
            </div>

            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius:12px; margin-bottom:1.5rem;">
                <label style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:0.5rem;">Logo Scale: ${u.logo_scale || 1.1}x</label>
                <input type="range" min="0.5" max="2.5" step="0.1" value="${u.logo_scale || 1.1}"
                       style="width:100%; accent-color:var(--accent);"
                       oninput="updateUniLogoScale(${u.id}, this.value)">
            </div>

            <div style="text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Campus Areas</span>
                    <button class="btn-accent-sm" onclick="addAreaToUni(${u.id})" style="padding:0.2rem 0.4rem;">+ Add</button>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                    ${(u.locations || [])
                      .map(area => `
                        <span style="font-size:0.75rem; background:rgba(255,255,255,0.03); padding:0.25rem 0.6rem; border-radius:8px; display:inline-flex; align-items:center; gap:6px; border:1px solid var(--card-border);">
                            ${area}
                            <span onclick="removeAreaFromUni(${u.id}, '${area}')" style="cursor:pointer; color:#f43f5e; font-weight:bold;">×</span>
                        </span>
                      `).join("")}
                    ${!u.locations?.length ? '<span style="color:var(--text-muted); font-size:0.75rem; font-style:italic;">None</span>' : ""}
                </div>
            </div>
        </div>
    `,
    ).join("");
};

async function renderInquiries() {
  const body = document.getElementById("inquiries-body");
  if (!body || !window.sb_client) return;

  const { data, error } = await window.sb_client
    .from('inquiries')
    .select('*, houses(title)')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    if (body) body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:3rem; color:var(--text-muted);">No student inquiries found.</td></tr>';
    return;
  }

  const userIds = data.map(i => i.user_id).filter(id => id);
  if (userIds.length > 0) {
    const { data: profiles } = await window.sb_client
      .from('profiles')
      .select('id, full_name, email, phone, university')
      .in('id', userIds);
    if (profiles) {
      data.forEach(inq => {
        inq.profiles = profiles.find(p => p.id === inq.user_id);
      });
    }
  }

  body.innerHTML = data.map(inq => `
    <tr>
      <td>
        <div style="font-weight:700; color:#fff;">${inq.profiles?.full_name || 'Anonymous Student'}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${inq.profiles?.phone || inq.profiles?.email || 'No contact'}</div>
      </td>
      <td><div style="color:var(--text-muted); font-size:0.9rem;">${inq.houses?.title || 'General Inquiry'}</div></td>
      <td><div class="message-cell">${inq.message}</div></td>
      <td style="font-size:0.8rem; color:var(--text-muted);">${new Date(inq.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

const adminSearchEl = document.getElementById("admin-search");
if (adminSearchEl) adminSearchEl.addEventListener("input", (e) => renderDashboard(e.target.value));

const statusFilterEl = document.getElementById("admin-status-filter");
if (statusFilterEl) statusFilterEl.addEventListener("change", () => renderDashboard(adminSearchEl?.value || ""));

const schoolFilterEl = document.getElementById("admin-school-filter");
if (schoolFilterEl) schoolFilterEl.addEventListener("change", () => renderDashboard(adminSearchEl?.value || ""));

const typeFilterEl = document.getElementById("admin-type-filter");
if (typeFilterEl) typeFilterEl.addEventListener("change", () => renderDashboard(adminSearchEl?.value || ""));

const sortFilterEl = document.getElementById("admin-sort-filter");
if (sortFilterEl) sortFilterEl.addEventListener("change", () => renderDashboard(adminSearchEl?.value || ""));

// Reset all admin filters
window.resetAdminFilters = () => {
  if (adminSearchEl) adminSearchEl.value = '';
  if (statusFilterEl) statusFilterEl.value = 'all';
  if (schoolFilterEl) schoolFilterEl.value = '';
  if (typeFilterEl) typeFilterEl.value = '';
  if (sortFilterEl) sortFilterEl.value = 'newest';
  renderDashboard('');
};

// Populate school filter
window.populateAdminSchoolFilter = () => {
  if (!schoolFilterEl) return;
  const universities = window.NIGERIA_UNIVERSITIES || {};
  schoolFilterEl.innerHTML = '<option value="">All Universities</option>';
  Object.keys(universities).forEach((school) => {
    const option = document.createElement("option");
    option.value = school;
    option.textContent = school;
    schoolFilterEl.appendChild(option);
  });
};

// Populate type filter
window.populateAdminTypeFilter = () => {
  if (!typeFilterEl) return;
  typeFilterEl.innerHTML = '<option value="">All Types</option>';
  (window.HOUSE_TYPES || []).forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeFilterEl.appendChild(option);
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  const isAdmin = await window.ensureAdminAccess();
  if (!isAdmin) return;
  setAdminLoading(true);
  if (window.fetchAllData) await window.fetchAllData();
  await waitForHousesReady();
  setAdminLoading(false);
  window.populateAdminSchoolFilter();
  window.populateAdminTypeFilter();
  renderDashboard();
  renderInquiries();
  renderUniversities();
});
