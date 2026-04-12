const filterSchool = document.getElementById("flt-school");
const filterArea = document.getElementById("flt-area");
const filterType = document.getElementById("flt-type");
const filterPrice = document.getElementById("flt-price");
const priceDisplay = document.getElementById("price-display");
const shopContainer = document.getElementById("shop-container");

let allListings = [];
let isLoading = false;

function setLoadingState(state) {
  isLoading = !!state;
  if (!shopContainer) return;
  if (isLoading) {
    shopContainer.innerHTML = `
      <div class="shop-loading">
        <div class="loading-card"></div>
        <div class="loading-card"></div>
        <div class="loading-card"></div>
        <div class="loading-card"></div>
      </div>
    `;
  } else {
    // Clear loading when false
    const loading = shopContainer.querySelector(".shop-loading");
    if (loading) loading.remove();
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function populateSchoolOptions() {
  if (!filterSchool) return;

  const universities = window.NIGERIA_UNIVERSITIES || {};
  filterSchool.innerHTML = '<option value="">Select University</option>';

  Object.keys(universities).forEach((school) => {
    const option = document.createElement("option");
    option.value = school;
    option.textContent = school;
    filterSchool.appendChild(option);
  });
}

function populateTypeOptions() {
  if (!filterType) return;

  filterType.innerHTML = '<option value="">House Type</option>';

  (window.HOUSE_TYPES || []).forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    filterType.appendChild(option);
  });
}

function populateAreaOptions(selectedSchool) {
  if (!filterArea) return;

  filterArea.innerHTML = '<option value="">Select Area / Location</option>';

  const areas =
    (window.NIGERIA_UNIVERSITIES &&
      window.NIGERIA_UNIVERSITIES[selectedSchool]) ||
    [];
  areas.forEach((area) => {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    filterArea.appendChild(option); // ← was incorrectly filterType
  });
}

function applyFilters() {
  if (window.getListings) {
    allListings = window.getListings();
  }
  console.log("applyFilters: allListings count:", allListings.length);
  const school = filterSchool ? filterSchool.value : "";
  const area = filterArea ? filterArea.value : "";
  const type = filterType ? filterType.value : "";
  const maxPrice = filterPrice ? Number(filterPrice.value) : Infinity;
  console.log(
    "applyFilters: filters - school:",
    school,
    "area:",
    area,
    "type:",
    type,
    "maxPrice:",
    maxPrice,
  );

  const filtered = allListings.filter((listing) => {
    // Filter by status (treat empty/null as active for newly created entries)
    const currentStatus = String(listing.status || "active").toLowerCase();
    if (currentStatus !== "active") {
      console.log(
        "Filtering out inactive listing:",
        listing.title,
        "status:",
        listing.status,
      );
      return false;
    }

    const location = String(listing.location || "").toLowerCase();
    let matches = true;

    if (school && !location.includes(school.toLowerCase())) matches = false;
    if (area && !location.includes(area.toLowerCase())) matches = false;
    if (type && listing.type !== type) matches = false;
    if (listing.price > maxPrice) matches = false;

    return matches;
  });
  console.log("applyFilters: result count:", filtered.length);

  renderShopGridView(filtered);
}

function renderShopGridView(listings) {
  if (!shopContainer) return;

  if (isLoading) return;
  if (!listings || !listings.length) {
    shopContainer.innerHTML = window.getEmptyStateHTML(
      "Oops! No houses found",
      "We couldn't find any pad matching those filters. Try searching for a different school or area. Or check if DB has data.",
    );
    return;
  }

  shopContainer.innerHTML = listings
    .map((listing) => {
      const image =
        listing.photo ||
        (listing.photos && listing.photos[0]) ||
        "https://via.placeholder.com/400x300?text=No+Image";
      const title = escapeHtml(listing.title);
      const location = escapeHtml(listing.location);
      const type = escapeHtml(listing.type);
      const detailsUrl = `../details/detail.html?id=${encodeURIComponent(listing.id)}`;
      const isFav = window.isFavorited ? window.isFavorited(listing.id) : false;

      return `
        <article class="list-card reveal" onclick="window.location.href='${detailsUrl}'" style="position:relative;">
          <div class="favorite-overlay" style="position:relative;">
             <img loading="lazy" src="${image}" alt="${title}">
             <button class="bookmarkBtn ${isFav ? "active" : ""}" data-house-id="${listing.id}"
                onclick="event.stopPropagation(); window.toggleFavorite(${listing.id})">
                <span class="IconContainer">
                  <svg viewBox="0 0 384 512" height="0.9em" class="icon">
                    <path d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"></path>
                  </svg>
                </span>
                <p class="text">Save</p>
             </button>
          </div>
          <div class="list-info">
            <h3>${title}</h3>
            <div class="list-meta">${location}</div>
            <div class="list-price-row">
              <span class="list-price">${window.formatPrice(listing.price)}</span>
              <span class="list-type">${type}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (window.initReveal) window.initReveal();
}

function waitForDataAndRender(maxWait = 10000) {
  setLoadingState(true);
  console.log(
    "Waiting for DB data... hasFetchedHouses:",
    window.hasFetchedHouses,
  );

  if (window.fetchAllData) {
    window.fetchAllData();
  }

  const start = Date.now();
  const poll = setInterval(() => {
    if (window.getListings) {
      allListings = window.getListings();
      console.log(
        "Poll: listings count:",
        allListings.length,
        "hasFetchedHouses:",
        window.hasFetchedHouses,
      );

      if (
        window.hasFetchedHouses ||
        allListings.length >= 4 ||
        Date.now() - start > maxWait
      ) {
        clearInterval(poll);
        setLoadingState(false);
        allListings = window.getListings ? window.getListings() : [];
        console.log("Data loaded, rendering:", allListings.length, "houses");
        applyFilters(); // Use applyFilters instead of direct render to respect any filters
        renderRecentlyViewed();
        // Removed noisy load toast per UX request
      }
    }
  }, 500);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("=== SHOP PAGE LOADING - DB PRIORITY ===");
  populateSchoolOptions();
  populateTypeOptions();

  waitForDataAndRender(); // Always wait for full DB data

  // Filter listeners
  if (filterSchool) {
    filterSchool.addEventListener("change", (event) => {
      populateAreaOptions(event.target.value);
      applyFilters();
    });
  }

  if (filterPrice && priceDisplay) {
    filterPrice.addEventListener("input", (e) => {
      priceDisplay.textContent = "₦" + Number(e.target.value).toLocaleString();
      applyFilters();
    });
  }

  // Global filter button if exists
  const filterBtn = document.getElementById("apply-filters");
  if (filterBtn) {
    filterBtn.addEventListener("click", applyFilters);
  }
});

function renderRecentlyViewed() {
  const recentIds = JSON.parse(
    localStorage.getItem("studenthome_recent") || "[]",
  );
  const section = document.getElementById("recently-viewed-section");
  const container = document.getElementById("recent-container");

  if (!recentIds.length || !section || !container) {
    if (section) section.style.display = "none";
    return;
  }

  const recents = recentIds
    .map((id) => allListings.find((l) => String(l.id) === String(id)))
    .filter(Boolean);
  if (recents.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  container.innerHTML = recents
    .map((listing) => {
      const image =
        listing.photo ||
        (listing.photos && listing.photos[0]) ||
        "https://via.placeholder.com/400x300";
      return `
        <article class="list-card" onclick="window.location.href='../details/detail.html?id=${encodeURIComponent(listing.id)}'">
          <img loading="lazy" src="${image}" alt="${escapeHtml(listing.title)}" style="height:150px;">
          <div class="list-info" style="padding: 1rem;">
            <h3 style="font-size:1.1rem;margin-bottom:0.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(listing.title)}</h3>
            <div class="list-price-row">
              <span class="list-price" style="font-size:1.1rem;">${window.formatPrice(listing.price)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

window.applyFilters = applyFilters;
window.populateSchoolOptions = populateSchoolOptions;
window.renderShopGrid = (listings) => {
  setLoadingState(false);
  allListings = Array.isArray(listings) ? listings : window.getListings();
  renderShopGridView(allListings);
  renderRecentlyViewed();
};
window.waitForDataAndRender = waitForDataAndRender;
