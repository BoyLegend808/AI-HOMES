const filterSchool = document.getElementById("flt-school");
const filterArea = document.getElementById("flt-area");
const filterType = document.getElementById("flt-type");
const filterRooms = document.getElementById("flt-rooms");
const filterSearch = document.getElementById("flt-search");
const shopContainer = document.getElementById("shop-container");
const sortSelect = document.getElementById("flt-sort");
const resultsCount = document.getElementById("results-count");
const clearSearchBtn = document.getElementById("btn-clear-search");

let allListings = [];
let isLoading = false;
let searchDebounceTimer = null;

// Toggle filter bar on mobile
window.toggleFilterBar = () => {
  const filterContent = document.getElementById("filter-content");
  if (filterContent) {
    filterContent.classList.toggle("active");
  }
};

// Clear search input
window.clearSearch = () => {
  if (filterSearch) {
    filterSearch.value = "";
    if (clearSearchBtn) clearSearchBtn.style.display = "none";
    applyFilters();
    filterSearch.focus();
  }
};

// Update active filters display
function updateActiveFilters() {
  const activeFiltersContainer = document.getElementById("active-filters");
  const activeFiltersList = document.getElementById("active-filters-list");
  
  if (!activeFiltersContainer || !activeFiltersList) return;
  
  const filters = [];
  
  if (filterSchool && filterSchool.value) {
    filters.push({ label: filterSchool.value, type: 'school' });
  }
  if (filterArea && filterArea.value) {
    filters.push({ label: filterArea.value, type: 'area' });
  }
  if (filterType && filterType.value) {
    filters.push({ label: filterType.value, type: 'type' });
  }
  if (filterRooms && filterRooms.value) {
    const roomLabels = { '1': '1 BR', '2': '2 BR', '3': '3 BR', '4': '4+ BR' };
    filters.push({ label: roomLabels[filterRooms.value] || filterRooms.value, type: 'rooms' });
  }
  if (filterSearch && filterSearch.value.trim()) {
    filters.push({ label: `"${filterSearch.value.trim().substring(0, 20)}${filterSearch.value.trim().length > 20 ? '...' : ''}"`, type: 'search' });
  }
  
  if (filters.length === 0) {
    activeFiltersContainer.style.display = "none";
    return;
  }
  
  activeFiltersContainer.style.display = "flex";
  activeFiltersList.innerHTML = filters.map(f => 
    `<span class="active-filter-tag">${f.label}</span>`
  ).join('');
}

// Show/hide clear button based on search input
if (filterSearch) {
  filterSearch.addEventListener("input", (e) => {
    if (clearSearchBtn) {
      clearSearchBtn.style.display = e.target.value ? "flex" : "none";
    }
    
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      applyFilters();
    }, 300);
  });
}

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

  filterArea.innerHTML = '<option value="">📍 Area</option>';

  const areas =
    (window.NIGERIA_UNIVERSITIES &&
      window.NIGERIA_UNIVERSITIES[selectedSchool]) ||
    [];
  areas.forEach((area) => {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    filterArea.appendChild(option);
  });
}

// Reset all filters
window.resetFilters = () => {
  if (filterSearch) filterSearch.value = '';
  if (filterSchool) filterSchool.value = '';
  if (filterArea) filterArea.value = '';
  if (filterType) filterType.value = '';
  if (filterRooms) filterRooms.value = '';
  applyFilters();
};

function applyFilters() {
  if (window.getListings) {
    allListings = window.getListings();
  }
  const searchText = filterSearch ? filterSearch.value.trim().toLowerCase() : "";
  const school = filterSchool ? filterSchool.value : "";
  const area = filterArea ? filterArea.value : "";
  const type = filterType ? filterType.value : "";
  const rooms = filterRooms ? filterRooms.value : "";
  const sortBy = sortSelect ? sortSelect.value : "newest";

  const filtered = allListings.filter((listing) => {
    const currentStatus = String(listing.status || "active").toLowerCase();
    if (currentStatus !== "active") return false;

    const location = String(listing.location || "").toLowerCase();
    const title = String(listing.title || "").toLowerCase();
    let matches = true;

    // Text search across title, location, area
    if (searchText) {
      const searchTerms = searchText.split(' ').filter(Boolean);
      const matchesSearch = searchTerms.some(term => 
        title.includes(term) || 
        location.includes(term) ||
        String(listing.area || "").toLowerCase().includes(term) ||
        String(listing.school || "").toLowerCase().includes(term)
      );
      if (!matchesSearch) matches = false;
    }

    if (school && !location.includes(school.toLowerCase())) matches = false;
    if (area && !location.includes(area.toLowerCase())) matches = false;
    if (type && listing.type !== type) matches = false;
    if (rooms) {
      const listingRooms = Number(listing.rooms) || 1;
      if (rooms === "4") {
        if (listingRooms < 4) matches = false; // 4+ rooms
      } else {
        if (listingRooms !== Number(rooms)) matches = false;
      }
    }

    return matches;
  });

  // Sort results
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "price-low": return (a.price || 0) - (b.price || 0);
      case "price-high": return (b.price || 0) - (a.price || 0);
      case "name-az": return String(a.title || "").localeCompare(String(b.title || ""));
      case "newest":
      default: return (new Date(b.created_at || 0)) - (new Date(a.created_at || 0));
    }
  });

  // Update results count
  if (resultsCount) {
    resultsCount.textContent = filtered.length + " " + (filtered.length === 1 ? "property" : "properties");
  }

  // Update active filters display
  updateActiveFilters();

  renderShopGridView(filtered);
}

function buildCardImageHTML(listing) {
  const photos = listing.photos || [];
  const mainImage = listing.photo || photos[0] || "https://via.placeholder.com/400x300?text=No+Image";
  const title = escapeHtml(listing.title);

  // If multiple photos, render swipeable gallery on mobile
  if (photos.length > 1) {
    const imagesHTML = photos.slice(0, 5).map((src) =>
      `<img loading="lazy" src="${src}" alt="${title}">`
    ).join("");
    const dotsHTML = photos.slice(0, 5).map((_, i) =>
      `<span class="dot${i === 0 ? " active" : ""}"></span>`
    ).join("");
    return `
      <div class="card-image-swipe" data-index="0" data-count="${Math.min(photos.length, 5)}">
        <div class="swipe-track">${imagesHTML}</div>
        <div class="card-image-dots">${dotsHTML}</div>
      </div>`;
  }
  return `<img loading="lazy" src="${mainImage}" alt="${title}">`;
}

function renderShopGridView(listings) {
  if (!shopContainer) return;

  if (isLoading) return;
  if (!listings || !listings.length) {
    shopContainer.innerHTML = window.getEmptyStateHTML(
      "No houses found",
      "We couldn't find any property matching those filters. Try changing the university, area or price range.",
    );
    return;
  }

  shopContainer.innerHTML = listings
    .map((listing) => {
      const title = escapeHtml(listing.title);
      const location = escapeHtml(listing.location);
      const type = escapeHtml(listing.type);
      const detailsUrl = `../details/detail.html?id=${encodeURIComponent(listing.id)}`;
      const isFav = window.isFavorited ? window.isFavorited(listing.id) : false;
      const imageHTML = buildCardImageHTML(listing);

      return `
        <article class="list-card reveal" onclick="window.location.href='${detailsUrl}'" style="position:relative;">
          <div class="favorite-overlay" style="position:relative;">
             ${imageHTML}
             ${listing.video_url ? '<div class="video-badge"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Video Tour</div>' : ''}
             <button class="bookmarkBtn ${isFav ? "active" : ""}" data-house-id="${listing.id}"
                onclick="event.stopPropagation(); window.toggleFavorite('${listing.id}')">
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
  initCardSwipe();
}

// Touch swipe for multi-image cards
function initCardSwipe() {
  document.querySelectorAll(".card-image-swipe").forEach((container) => {
    const track = container.querySelector(".swipe-track");
    const dots = container.querySelectorAll(".dot");
    const count = parseInt(container.dataset.count, 10) || 1;
    if (count <= 1 || !track) return;

    let startX = 0;
    let currentIndex = 0;

    const goTo = (idx) => {
      currentIndex = Math.max(0, Math.min(idx, count - 1));
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === currentIndex));
      container.dataset.index = currentIndex;
    };

    container.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener("touchend", (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        e.preventDefault();
        e.stopPropagation();
        goTo(currentIndex + (diff > 0 ? 1 : -1));
      }
    });

    // Prevent card click when swiping
    container.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });
}

function waitForDataAndRender(maxWait = 15000) {
  setLoadingState(true);

  if (window.fetchAllData) {
    window.fetchAllData();
  }

  const start = Date.now();
  const poll = setInterval(() => {
    if (window.getListings) {
      allListings = window.getListings();

      if (
        window.hasFetchedHouses ||
        allListings.length >= 4 ||
        Date.now() - start > maxWait
      ) {
        clearInterval(poll);
        setLoadingState(false);
        allListings = window.getListings ? window.getListings() : [];
        applyFilters();
        renderRecentlyViewed();
      }
    }
  }, 500);
}

document.addEventListener("DOMContentLoaded", () => {
  populateSchoolOptions();
  populateTypeOptions();

  waitForDataAndRender();

  // Filter listeners - auto-apply on change
  if (filterSchool) {
    filterSchool.addEventListener("change", (event) => {
      populateAreaOptions(event.target.value);
      applyFilters();
    });
  }

  if (filterArea) {
    filterArea.addEventListener("change", applyFilters);
  }

  if (filterType) {
    filterType.addEventListener("change", applyFilters);
  }

  if (filterRooms) {
    filterRooms.addEventListener("change", applyFilters);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", applyFilters);
  }
});

function renderRecentlyViewed() {
  const section = document.getElementById("recently-viewed-section");
  const container = document.getElementById("recent-container");
  if (!section || !container) return;

  // Use only Supabase user_metadata — no localStorage
  if (!window.sb_client) {
    section.style.display = "none";
    return;
  }

  window.sb_client.auth.getUser().then(({ data }) => {
    const ids = data?.user?.user_metadata?.recently_viewed || [];
    if (!ids.length) { section.style.display = "none"; return; }

    const recents = ids
      .map((id) => allListings.find((l) => String(l.id) === String(id)))
      .filter(Boolean);

    if (!recents.length) { section.style.display = "none"; return; }

    section.style.display = "block";
    container.innerHTML = recents.map((listing) => {
      const image = listing.photo || (listing.photos && listing.photos[0]) || "https://via.placeholder.com/400x300";
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
    }).join("");
  }).catch(() => { section.style.display = "none"; });
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
