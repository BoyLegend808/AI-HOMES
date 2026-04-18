// StudentHome - Main Application Script

// DOM Elements
const screens = document.querySelectorAll(".page");
const navLinks = document.querySelectorAll(".nav-link");
const featured = document.getElementById("featured");
const listingCards = document.getElementById("listingCards");
const adminListings = document.getElementById("adminListings");
const priceRange = document.getElementById("priceRange");
const priceValue = document.getElementById("priceValue");
const locationFilter = document.getElementById("locationFilter");
const typeFilter = document.getElementById("typeFilter");
const search = document.getElementById("search");
const adminSearch = document.getElementById("adminSearch");
const listingForm = document.getElementById("listingForm");
const requestInfo = document.getElementById("requestInfo");
const detailsTitle = document.getElementById("detailsTitle");
const detailsLocation = document.getElementById("detailsLocation");
const detailsPrice = document.getElementById("detailsPrice");
const detailsDesc = document.getElementById("detailsDesc");
const detailsMeta = document.getElementById("detailsMeta");
const detailsImage = document.getElementById("detailsImage");

// Screen Navigation
function activateScreen(screen) {
  screens.forEach((s) => s.classList.toggle("active", s.id === screen));
  navLinks.forEach((link) =>
    link.classList.toggle("active", link.dataset.screen === screen),
  );
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => activateScreen(link.dataset.screen));
});

// Render Card Template
const renderCard = (item) => {
  const isFav = window.isFavorited ? window.isFavorited(item.id) : false;
  return `
  <article class="card-item" data-id="${item.id}" style="position:relative;">
    <div class="card-image-wrapper" style="position:relative;">
      <img src="${item.photo || item.photos?.[0]}" alt="${item.title}" />
      <button class="bookmarkBtn ${isFav ? "active" : ""}" data-house-id="${item.id}" onclick="event.stopPropagation(); window.toggleFavorite('${item.id}')">
        <span class="IconContainer">
          <svg viewBox="0 0 384 512" height="0.9em" class="icon"><path d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"></path></svg>
        </span>
        <p class="text">Save</p>
      </button>
    </div>
    <div class="card-body">
      <h3>${item.title}</h3>
      <p class="muted">${item.location} • ${item.type}</p>
      <p class="price">${window.formatPrice(item.price, true)}</p>
      <button class="btn action-btn" data-action="view" data-id="${item.id}">Open</button>
    </div>
  </article>
`;
};

// Refresh Lists
const refreshLists = () => {
  const listings = window.getListings ? window.getListings() : [];
  // Use a different card renderer for the carousel to match the premium trending look
  const carousel = document.getElementById("carousel");
  if (carousel) {
    if (listings.length > 0) {
      carousel.innerHTML = listings
        .map(
          (item) => {
            const isFav = window.isFavorited ? window.isFavorited(item.id) : false;
            return `
              <article class="testimonial-card trending-card" style="width:300px; padding:0; overflow:hidden; position:relative;" onclick="window.location.href='../details/detail.html?id=${item.id}'">
                <div style="position:relative; height:180px;">
                  <img src="${item.photo || (item.photos && item.photos[0]) || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800"}" style="width:100%; height:100%; object-fit:cover;">
                  <button class="bookmarkBtn ${isFav ? "active" : ""}" data-house-id="${item.id}" onclick="event.stopPropagation(); window.toggleFavorite('${item.id}')">
                    <span class="IconContainer">
                      <svg viewBox="0 0 384 512" height="0.9em" class="icon"><path d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"></path></svg>
                    </span>
                    <p class="text">Save</p>
                  </button>
                </div>
                <div style="padding:1.5rem;">
                  <h4 style="margin-bottom:0.5rem; color:white;">${item.title}</h4>
                  <p style="color:var(--accent); font-weight:700;">₦${item.price.toLocaleString()}</p>
                  <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">${item.location}</p>
                </div>
              </article>
            `;
          }
        )
        .join("");
    } else if (window.CLOUD_ENGINE_READY) {
       carousel.innerHTML = '<p class="muted">No upcoming listings yet.</p>';
    }
  }

  if (listingCards) {
    listingCards.innerHTML = listings.map(renderCard).join("");
  }

  // Render Reviews
  const reviewsTrack = document.getElementById("reviews-track");
  if (reviewsTrack && window.getReviews) {
    const reviews = window.getReviews();
    if (reviews.length > 0) {
      reviewsTrack.innerHTML = reviews
        .map(
          (rev) => `
        <div class="testimonial-card">
          <div class="testimonial-header">
            <div class="rating-stars">★★★★★</div>
            <span class="verified-badge">Verified</span>
          </div>
          <p class="testimonial-text">"${rev.text}"</p>
          <div class="client-profile">
            <div class="client-img-wrapper">
               <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--accent); color:black; font-weight:bold; font-size:1.2rem;">${rev.name.charAt(0)}</div>
            </div>
            <div class="client-info">
              <cite>${rev.name}</cite>
              <span class="client-role">${rev.school || "Verified Student"}</span>
            </div>
          </div>
        </div>
      `,
        )
        .join("");
    } else if (window.CLOUD_ENGINE_READY) {
      reviewsTrack.innerHTML = '<p class="muted">No reviews yet.</p>';
    }
  }

  // Render Review Form
  const reviewFormBox = document.getElementById("review-form-box");
  if (reviewFormBox) {
    reviewFormBox.innerHTML = `
      <h3>Share Your Experience</h3>
      <p style="color:var(--text-muted); margin-bottom:1.5rem; font-size:0.9rem;">Help other students by leaving a review about your housing search.</p>
      <div class="form-group" style="margin-bottom:1rem;">
        <textarea id="rev-text" placeholder="Write your review here..." style="min-height:100px;"></textarea>
      </div>
      <button class="btn-review-submit" onclick="submitReview()">
        <span>Submit Review</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    `;
  }
};

window.submitReview = async () => {
  const text = document.getElementById("rev-text")?.value.trim();
  const user = window.getCurrentUser ? window.getCurrentUser() : null;

  if (!user) {
    alert("Please login to leave a review.");
    window.location.href = "../auth/auth.html";
    return;
  }

  if (!text) {
    alert("Please write something first!");
    return;
  }

  if (window.sb_client) {
    const { error } = await window.sb_client.from("reviews").insert([
      {
        name: user.name,
        text: text,
        school: user.university,
        avatar: "",
      },
    ]);

    if (!error) {
      alert("Review submitted! Thank you.");
      document.getElementById("rev-text").value = "";
      if (window.fetchAllData) window.fetchAllData();
    } else {
      alert("Error submitting review: " + error.message);
    }
  } else {
    alert("Review system is offline. Try again later.");
  }
};

// Filter Data
function filterData() {
  const limit = Number(priceRange?.value || 1500);
  const locationVal = locationFilter?.value || "all";
  const typeVal = typeFilter?.value || "all";
  const q = search?.value?.trim().toLowerCase() || "";

  return window.getListings().filter((item) => {
    const priceOk = item.price <= limit;
    const locationOk = locationVal === "all" || item.location === locationVal;
    const typeOk = typeVal === "all" || item.type === typeVal;
    const textOk =
      q === "" ||
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q);
    return priceOk && locationOk && typeOk && textOk;
  });
}

// Apply Filters
function applyFilters() {
  const filtered = filterData();
  if (listingCards) listingCards.innerHTML = filtered.map(renderCard).join("");
  if (featured) featured.innerHTML = filtered.map(renderCard).join("");
}

// Event Listeners for Filters
if (priceRange) {
  priceRange.addEventListener("input", () => {
    if (priceValue) priceValue.textContent = "$" + priceRange.value;
    applyFilters();
  });
}

if (locationFilter) locationFilter.addEventListener("change", applyFilters);
if (typeFilter) typeFilter.addEventListener("change", applyFilters);
if (search) search.addEventListener("input", applyFilters);

// Admin Search
if (adminSearch) {
  adminSearch.addEventListener("input", () => {
    const q = adminSearch.value.toLowerCase();
    if (adminListings) {
      adminListings.innerHTML = window
        .getListings()
        .filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.status.toLowerCase().includes(q),
        )
        .map(
          (item) =>
            `<div class="list-row"><h3>${item.title}</h3><span class="status-pill">${item.status}</span></div>`,
        )
        .join("");
    }
  });
}

// Render University Partners
const renderUniversities = () => {
  const uniTrack = document.querySelector(".uni-logo-track");
  if (!uniTrack) return;

  const unis = window.CLOUD_UNIVERSITIES_DATA || [];
  if (unis.length > 0) {
    uniTrack.innerHTML = unis
      .map(
        (u) => `
      <div class="uni-logo-item">
        <div class="uni-logo-placeholder" style="overflow:hidden; background:transparent; border:none; width:50px; height:50px;">
          <img src="${u.logo_url || "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?q=80&w=200&auto=format&fit=crop"}" 
               style="width:100%; height:100%; object-fit:contain; transform: scale(${u.logo_scale || 1.1}); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3)); transition: 0.3s ease;">
        </div>
        <span>${u.name}</span>
      </div>
    `,
      )
      .join("");
  } else if (window.CLOUD_ENGINE_READY) {
    uniTrack.innerHTML = '<p class="muted">No partners yet.</p>';
  }
};

// Initial Call
document.addEventListener("DOMContentLoaded", () => {
  refreshLists();
  renderUniversities();
});

// Render Details
function renderDetails(item) {
  if (detailsTitle) detailsTitle.textContent = item.title;
  if (detailsLocation) detailsLocation.textContent = item.location;
  if (detailsPrice)
    detailsPrice.textContent = window.formatPrice(item.price, true);
  if (detailsDesc) detailsDesc.textContent = item.desc;
  if (detailsImage) detailsImage.src = item.photo || item.photos?.[0];
  if (detailsMeta)
    detailsMeta.innerHTML = item.amenities.map((a) => `<li>${a}</li>`).join("");
}

// Choose Item by ID
function chooseItemById(id) {
  const item = window.getListings().find((x) => String(x.id) === String(id));
  if (!item) return;
  renderDetails(item);
  activateScreen("details");
}

// Handle Card Actions
function handleCardActions(e) {
  const btn = e.target.closest('[data-action="view"]');
  if (!btn) return;
  const id = btn.dataset.id;
  chooseItemById(id);
}

if (featured) featured.addEventListener("click", handleCardActions);
if (listingCards) listingCards.addEventListener("click", handleCardActions);

// Request Info Button
if (requestInfo) {
  requestInfo.addEventListener("click", () => {
    alert("Request sent! Admin will contact you soon.");
  });
}

// Initialize functionality
document.addEventListener("DOMContentLoaded", () => {
  const navOverlay = document.querySelector(".nav-overlay");
  if (navOverlay && window.closeMobileMenu) {
    navOverlay.addEventListener("click", () => {
      window.closeMobileMenu();
    });
  }
});

// Listing Form Submit
if (listingForm) {
  listingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(listingForm);
    const listing = {
      title: form.get("title"),
      location: form.get("location"),
      price: Number(form.get("price")),
      rooms: Number(form.get("rooms")),
      status: "Active",
      type: form.get("type") || "Shared",
      photo: form.get("photo"),
      desc: form.get("description"),
      amenities: Array.from(form.getAll("amenities")),
    };

    window.addListing(listing).then(() => {
      listingForm.reset();
      alert("Listing saved to Cloud.");
      window.location.reload();
    });
  });
}

// Initialize Cloud Engine Connection
if (window.fetchAllData) {
  window.fetchAllData().then(() => {
    window.CLOUD_ENGINE_READY = true;
    refreshLists();
    renderUniversities();
  });
} else {
  window.CLOUD_ENGINE_READY = true;
  refreshLists();
  renderUniversities();
}

// Link to global cloud trigger
window.renderShopGrid = refreshLists;
