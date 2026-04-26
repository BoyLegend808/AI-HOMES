// Separate admin page for Property Management (filterable + skeleton loading)

function setPropertiesLoading(isLoading) {
  const loadingEl = document.getElementById("admin-loading");
  const tableWrap = document.querySelector(".listings-table-container");
  const cardsWrap = document.getElementById("listings-cards");

  if (loadingEl) loadingEl.style.display = isLoading ? "flex" : "none";
  if (tableWrap) tableWrap.style.display = isLoading ? "none" : "";
  if (cardsWrap) cardsWrap.style.display = isLoading ? "none" : "";
}

async function waitForHousesReady({ timeoutMs = 8000 } = {}) {
  // `fetchAllData()` is not awaitable when in-flight, so we wait for the flag it sets.
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

function populateFilters() {
  const schoolSelect = document.getElementById("admin-school-filter");
  const typeSelect = document.getElementById("admin-type-filter");
  
  if (schoolSelect && window.getUniversities) {
    const savedVal = schoolSelect.value;
    const uniNames = Object.keys(window.getUniversities());
    schoolSelect.innerHTML = '<option value="">All Universities</option>' +
      uniNames.map(u => `<option value="${u}">${u}</option>`).join("");
    if (uniNames.includes(savedVal)) schoolSelect.value = savedVal;
    else schoolSelect.value = "";
  }

  if (typeSelect && window.HOUSE_TYPES) {
    const savedVal = typeSelect.value;
    typeSelect.innerHTML = '<option value="">All Types</option>' +
      window.HOUSE_TYPES.map(t => `<option value="${t}">${t}</option>`).join("");
    if (window.HOUSE_TYPES.includes(savedVal)) typeSelect.value = savedVal;
    else typeSelect.value = "";
  }
}

async function renderProperties(filter = "") {
  let allListings = [];
  if (window.fetchAdminHouses) {
    allListings = await window.fetchAdminHouses();
  } else {
    allListings = window.getListings ? window.getListings() : [];
  }
 
  const query = String(filter || "").toLowerCase();
  const statusFilter = document.getElementById("admin-status-filter")?.value || "all";
  const schoolFilter = document.getElementById("admin-school-filter")?.value || "";
  const typeFilter = document.getElementById("admin-type-filter")?.value || "";
  const sortFilter = document.getElementById("admin-sort-filter")?.value || "newest";
 
  let listings = allListings.filter((l) => {
    // Search
    if (query) {
      const matches = String(l.title || "").toLowerCase().includes(query) ||
                      String(l.location || "").toLowerCase().includes(query) ||
                      String(l.school || "").toLowerCase().includes(query) ||
                      String(l.area || "").toLowerCase().includes(query);
      if (!matches) return false;
    }
    // Status filter
    if (statusFilter !== "all" && String(l.status || "") !== statusFilter) return false;
    // School filter
    if (schoolFilter && String(l.school || "") !== schoolFilter) return false;
    // Type filter
    if (typeFilter && String(l.type || "") !== typeFilter) return false;
    
    return true;
  });

  // Sorting
  listings.sort((a, b) => {
    switch (sortFilter) {
      case "oldest": return (new Date(a.created_at || 0)) - (new Date(b.created_at || 0));
      case "price-high": return (b.price || 0) - (a.price || 0);
      case "price-low": return (a.price || 0) - (b.price || 0);
      case "name-az": return String(a.title || "").localeCompare(String(b.title || ""));
      case "newest":
      default: return (new Date(b.created_at || 0)) - (new Date(a.created_at || 0));
    }
  });

  const propCountEl = document.getElementById("prop-count");
  const activeCountEl = document.getElementById("active-count");
  if (propCountEl) propCountEl.textContent = allListings.length;
  if (activeCountEl)
    activeCountEl.textContent = allListings.filter((h) => h.status === "Active").length;

  const body = document.getElementById("listings-body");
  const cards = document.getElementById("listings-cards");

  if (listings.length === 0) {
    if (body) {
      body.innerHTML =
        '<tr><td colspan="4" style="text-align:center; padding:3rem; color:var(--muted);">No results found</td></tr>';
    }
    if (cards) {
      cards.innerHTML =
        '<p style="text-align:center; padding:2rem; color:var(--muted);">No results found</p>';
    }
    return;
  }

  const rowsHtml = listings
    .map(
      (l) => `
        <tr>
          <td>
            <div class="property-cell">
              <div class="image-container">
                <img loading="lazy" decoding="async" src="${l.photo || (l.photos && l.photos[0]) || ""}" class="property-thumb" alt="">
                <button class="image-remove-btn" onclick="removeImageCard(event, ${l.id})" title="Remove image">×</button>
              </div>
              <div class="property-info">
                <h4>${l.title}</h4>
                <p>${l.location}</p>
              </div>
            </div>
          </td>
          <td>₦${l.price.toLocaleString()}</td>
          <td><span class="status-badge ${String(l.status || "").toLowerCase()}">${l.status}</span></td>
          <td>
            <div class="actions">
              <button class="btn btn-small" style="background: rgba(255,255,255,0.1); color:white;" onclick="toggleStatus(${l.id}, '${l.status}')">${l.status === "Active" ? "Hide" : "Show"}</button>
              <button class="btn btn-small btn-edit" onclick="window.location.href='../admin-form/admin-form.html?edit=${l.id}&back=properties'">Edit</button>
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
          <div class="image-container">
            <img loading="lazy" decoding="async" src="${l.photo || (l.photos && l.photos[0]) || ""}" alt="">
            <button class="image-remove-btn" onclick="removeImageCard(event, ${l.id})" title="Remove card">×</button>
          </div>
          <div class="listing-card-content">
            <h4>${l.title}</h4>
            <p>${l.location}</p>
            <div style="font-weight:700; color:var(--accent); margin-bottom:1rem;">₦${l.price.toLocaleString()} <span class="status-badge ${String(l.status || "").toLowerCase()}" style="margin-left:0.5rem; font-size:0.6rem; padding:0.2rem 0.5rem;">${l.status}</span></div>
            <div class="listing-card-actions">
              <button class="btn btn-small" style="flex:1; background: rgba(255,255,255,0.1); color:white;" onclick="toggleStatus(${l.id}, '${l.status}')">${l.status === "Active" ? "Hide" : "Show"}</button>
              <button class="btn btn-small btn-edit" style="flex:1;" onclick="window.location.href='../admin-form/admin-form.html?edit=${l.id}&back=properties'">Edit</button>
              <button class="btn btn-small btn-delete" style="flex:1;" onclick="handleDelete(${l.id})">Delete</button>
            </div>
          </div>
        </div>
      `,
    )
    .join("");

  if (body) body.innerHTML = rowsHtml;
  if (cards) cards.innerHTML = cardsHtml;
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === "Active" ? "Hidden" : "Active";
  const res = await window.updateListing({ id, status: newStatus });
  if (!res.success) alert("Error toggling: " + res.error?.message);
  if (window.fetchAllData) await window.fetchAllData();
  renderProperties(document.getElementById("admin-search")?.value || "");
}
window.toggleStatus = toggleStatus;

async function handleDelete(id) {
  if (confirm("Delete this listing permanently?")) {
    const res = await window.deleteListing(id);
    if (!res.success) alert("Delete Error: " + res.error?.message);
    if (window.fetchAllData) await window.fetchAllData();
    renderProperties(document.getElementById("admin-search")?.value || "");
  }
}
window.handleDelete = handleDelete;

window.removeImageCard = async (event, id) => {
  if (!confirm("Delete this property from database?")) return;
  const rowOrCard = event.target.closest('tr, .listing-card');
  if (rowOrCard) {
    rowOrCard.style.transition = 'opacity 0.3s ease';
    rowOrCard.style.opacity = '0';
    await window.deleteListing(id);
    if (window.fetchAllData) await window.fetchAllData();
    setTimeout(() => {
      renderProperties(document.getElementById("admin-search")?.value || "");
    }, 300);
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const isAdmin = await window.ensureAdminAccess();
  if (!isAdmin) return;

  setPropertiesLoading(true);
  if (window.fetchAllData) await window.fetchAllData();
  try {
    await waitForHousesReady();
    populateFilters();
    await renderProperties();
  } catch (e) {
    console.error(e);
  } finally {
    setPropertiesLoading(false);
  }
 
  const adminSearchEl = document.getElementById("admin-search");
  const filters = [
    "admin-search",
    "admin-status-filter",
    "admin-school-filter",
    "admin-type-filter",
    "admin-sort-filter"
  ];

  filters.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const event = (id === "admin-search") ? "input" : "change";
      el.addEventListener(event, () => {
        renderProperties(adminSearchEl?.value || "");
      });
    }
  });
});

window.resetAdminFilters = () => {
  const ids = ["admin-search", "admin-status-filter", "admin-school-filter", "admin-type-filter", "admin-sort-filter"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    }
  });
  renderProperties();
};

