let listing = null;

window.renderDetailsPage = () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const all = window.getListings ? window.getListings() : [];

  if (!id) {
    if (all.length > 0) listing = all[0];
  } else {
    listing = window.getListingById(id);
  }

  if (!listing) {
    // Only show "not found" if we actually have data but no matching ID
    if (all.length > 0) {
      document.getElementById("app").innerHTML =
        '<div style="padding:4rem;text-align:center;color:white;font-weight:600;">Listing not found. <br><br> <a href="../shop/shop.html" style="color:var(--accent);">← Go back to Shop</a></div>';
    }
    return;
  }

  renderDetails();
  window.incrementViews(id);

  // Store recently viewed - localStorage + Supabase sync
  try {
    let recent = JSON.parse(localStorage.getItem("studenthome_recent") || "[]");
    recent = recent.filter((r) => String(r) !== String(id));
    recent.unshift(id);
    if (recent.length > 10) recent.pop();
    localStorage.setItem("studenthome_recent", JSON.stringify(recent));

    // Sync to Supabase user_metadata if logged in (cross-device)
    if (window.sb_client) {
      window.sb_client.auth.getUser().then(({ data }) => {
        if (data?.user) {
          window.sb_client.auth.updateUser({
            data: { recently_viewed: recent.slice(0, 10) }
          }).catch(() => {});
        }
      });
    }
  } catch (e) {}
};

document.addEventListener("DOMContentLoaded", () => {
  // Show logo text on inner pages
  const lt = document.querySelector(".logo-text");
  if (lt && window.innerWidth > 480) lt.style.display = "inline-block";

  const currentListings = window.getListings ? window.getListings() : [];
  if (currentListings.length > 0) {
    window.renderDetailsPage();
  } else {
    // Show skeleton while loading
    document.getElementById("app").innerHTML = `
      <div class="details-grid" style="padding: 2rem;">
        <div class="left-col">
          <div class="hero-image loading-card" style="animation: pulse 1.5s infinite; background: rgba(255,255,255,0.05); border-radius: 24px;"></div>
          
          <div class="gallery-row" style="margin-top:1rem; opacity:0.5;">
            <div class="loading-card" style="width:80px; height:80px; border-radius:12px; background: rgba(255,255,255,0.1); animation: pulse 1.5s infinite;"></div>
            <div class="loading-card" style="width:80px; height:80px; border-radius:12px; background: rgba(255,255,255,0.1); animation: pulse 1.5s infinite; animation-delay: 0.1s;"></div>
            <div class="loading-card" style="width:80px; height:80px; border-radius:12px; background: rgba(255,255,255,0.1); animation: pulse 1.5s infinite; animation-delay: 0.2s;"></div>
          </div>
          
          <div style="height: 30px; width: 40%; background: rgba(255,255,255,0.05); margin-top:2rem; border-radius: 8px; animation: pulse 1.5s infinite;"></div>
          <div style="height: 15px; width: 100%; background: rgba(255,255,255,0.05); margin-top:1rem; border-radius: 8px; animation: pulse 1.5s infinite;"></div>
          <div style="height: 15px; width: 80%; background: rgba(255,255,255,0.05); margin-top:0.5rem; border-radius: 8px; animation: pulse 1.5s infinite;"></div>
        </div>

        <div class="right-col">
          <div style="height: 40px; width: 80%; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 1rem; animation: pulse 1.5s infinite;"></div>
          <div style="height: 20px; width: 50%; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 1.5rem; animation: pulse 1.5s infinite;"></div>
          
          <div class="features" style="display:flex; gap:0.5rem; margin-bottom:2rem;">
            <div style="height: 35px; width: 100px; background: rgba(255,255,255,0.05); border-radius: 20px; animation: pulse 1.5s infinite;"></div>
            <div style="height: 35px; width: 120px; background: rgba(255,255,255,0.05); border-radius: 20px; animation: pulse 1.5s infinite; animation-delay:0.1s"></div>
          </div>
          
          <div class="checkout-wrapper" style="background: rgba(255,255,255,0.02); height: 250px; border-radius: 24px; animation: pulse 1.5s infinite; border: 1px solid rgba(255,255,255,0.05);"></div>
        </div>
      </div>
    `;
  }
});

function renderDetails() {
  const app = document.getElementById("app");

  const allPhotos =
    listing.photos && listing.photos.length > 0
      ? listing.photos
      : listing.photo
        ? [listing.photo]
        : [];
  const mainPhoto =
    allPhotos.length > 0
      ? allPhotos[0]
      : "https://via.placeholder.com/400x300?text=No+Photo";
  const photosHtml = allPhotos
    .map(
      (p, idx) => `
    <img src="${p}" class="gallery-img" onclick="setMainImage('${p}', ${idx})">
  `,
    )
    .join("");

  app.innerHTML = `
    <div class="details-grid">
      <div class="left-col">
        <div class="hero-image" id="main-hero" style="background-image: url('${mainPhoto}'); cursor: pointer;" onclick="openLightbox(currentPhotoIndex)">
          <div class="expand-hint">🔍 Expand</div>
          <button class="back-btn" onclick="event.stopPropagation(); window.location.href='../shop/shop.html'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>
        
        <div class="gallery-row">
          ${photosHtml}
        </div>
        
        <h3 class="section-title">Description</h3>
        <p class="desc">${listing.description || "Verified property listing connected to StudentHome."}</p>

        <h3 class="section-title">Reviews & Ratings</h3>
        <div id="reviews-container" style="margin-bottom: 2rem;"></div>
        
        <div id="review-form-container" style="background: var(--bg-panel); padding: 1.5rem; border-radius: 16px; border: 1px solid var(--card-border);">
          <h4 style="margin-bottom:1rem; font-size:1.1rem;">Write a Review</h4>
          <textarea id="review-text" rows="3" style="width:100%; padding:1rem; border-radius:12px; background:var(--bg-dark); color:white; border:1px solid rgba(255,255,255,0.1); margin-bottom:1rem; resize:vertical;" placeholder="What was your experience with this property?"></textarea>
          <button class="btn-checkout" style="padding: 0.8rem; border-radius: 12px;" onclick="submitReview()">Post Review</button>
        </div>
      </div>

      <div class="right-col">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
          <h1 class="details-title" style="flex:1;">${listing.title}</h1>
          <button class="bookmarkBtn ${window.isFavorited(listing.id) ? "active" : ""}" 
            data-house-id="${listing.id}"
            style="position:relative; top:0; right:0;"
            onclick="event.stopPropagation(); window.toggleFavorite(${listing.id})">
              <span class="IconContainer">
                <svg viewBox="0 0 384 512" height="0.9em" class="icon"><path d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"></path></svg>
              </span>
              <p class="text">Save</p>
          </button>
        </div>
        <div style="font-weight: 700; color: var(--accent); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${listing.exactLocation || "Street Details Not Provided"}
        </div>
        <div class="details-meta">${listing.school || "Unknown"} • ${listing.area || "Unknown"}</div>
        
        <div class="features">
          <div class="feature-tag">🛏️ ${listing.rooms || 1} Bedroom</div>
          <div class="feature-tag">🏠 ${listing.type || "Standard"}</div>
          <div class="feature-tag">✅ Verified</div>
          <div class="feature-tag">📍 Near Campus</div>
        </div>

        <div class="checkout-wrapper">
          <span class="price">₦${listing.price.toLocaleString()}</span>
          <span class="price-sub">Exclusive of utilities</span>
          <button class="btn-checkout" onclick="handleCheckout()">Check Out Contact</button>
        </div>
      </div>
    </div>
  `;
}

let currentPhotoIndex = 0;

function setMainImage(url, index) {
  document.getElementById("main-hero").style.backgroundImage = `url('${url}')`;
  if (index !== undefined) currentPhotoIndex = index;
}

function getPhotosArray() {
  return listing.photos && listing.photos.length > 0
    ? listing.photos
    : listing.photo
      ? [listing.photo]
      : [];
}

function openLightbox(index = 0) {
  const photos = getPhotosArray();
  if (photos.length === 0) return;
  currentPhotoIndex = index;
  document.getElementById("lightbox-img").src = photos[currentPhotoIndex];
  document.getElementById("lightbox").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
  document.body.style.overflow = "";
}

function prevLightboxImage(e) {
  if (e) e.stopPropagation();
  const photos = getPhotosArray();
  currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
  document.getElementById("lightbox-img").src = photos[currentPhotoIndex];
}

function nextLightboxImage(e) {
  if (e) e.stopPropagation();
  const photos = getPhotosArray();
  currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
  document.getElementById("lightbox-img").src = photos[currentPhotoIndex];
}

function handleCheckout() {
  const user = window.getCurrentUser();
  if (!user) {
    alert("Please login or create an account to view owner contact details.");
    window.location.href = "../auth/auth.html";
    return;
  }

  document.getElementById("call-text").textContent =
    "Call " + (listing.contact?.phone || "Unavailable");
  document.getElementById("contact-call").href =
    "tel:" + (listing.contact?.phone || "");
  document.getElementById("wa-text").textContent =
    "WhatsApp " + (listing.contact?.whatsapp || "Unavailable");
  document.getElementById("contact-wa").href =
    "https://wa.me/" + (listing.contact?.whatsapp || "");
  document.getElementById("contact-modal").style.display = "flex";
}

async function sendInquiry() {
  const msg = document.getElementById("inquiry-message").value.trim();
  if (!msg) return alert("Please enter a message.");

  const user = await window.fetchSessionUser();
  if (!user) {
    alert("You must be logged in to send a message.");
    window.location.href = "../auth/auth.html";
    return;
  }

  const btn = document.getElementById("btn-send-inquiry");
  btn.textContent = "Sending...";
  btn.disabled = true;

  const { data: userData } = await window.sb_client.auth.getUser();

  const res = await window.createInquiry({
    house_id: listing.id,
    user_id: userData.user.id,
    message: msg,
    status: 'Pending'
  });

  if (res && !res.error) {
    window.showToast("Message sent to Manager!", "success");
    document.getElementById("inquiry-message").value = "";
    closeModal();
  } else {
    alert("Failed to send message. Please try again.");
  }
  btn.textContent = "Send Message";
  btn.disabled = false;
}

function closeModal() {
  document.getElementById("contact-modal").style.display = "none";
}

async function ensureReviewsRendered() {
  const allReviews = window.getReviews ? window.getReviews() : [];
  let houseReviews = allReviews.filter(
    (r) => String(r.house_id) === String(listing.id),
  );

  const container = document.getElementById("reviews-container");
  if (!container) return;

  if (houseReviews.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-muted); font-style:italic;">No reviews yet. Be the first to review!</p>';
    return;
  }

  container.innerHTML = houseReviews
    .map(
      (r) => `
    <div style="background: rgba(255,255,255,0.03); padding: 1.2rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.05);">
      <div style="font-weight:700; color:var(--text-main); margin-bottom:0.4rem; display:flex; align-items:center; gap:0.5rem;">
        <div style="width:24px; height:24px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:0.75rem;">${r.name.charAt(0)}</div>
        ${r.name}
      </div>
      <div style="color:var(--text-muted); font-size:0.95rem; line-height:1.5;">${r.text}</div>
    </div>
  `,
    )
    .join("");
}

async function submitReview() {
  const text = document.getElementById("review-text").value.trim();
  if (!text) return alert("Please enter a review.");

  const user = await window.fetchSessionUser();
  if (!user) {
    alert("You must be logged in to leave a review.");
    window.location.href = "../auth/auth.html";
    return;
  }

  const reviewPayload = {
    house_id: listing.id,
    name: user.name,
    school: user.university,
    text: text,
  };

  const btn = document.querySelector("#review-form-container button");
  btn.textContent = "Posting...";
  btn.disabled = true;

  const res = await window.addReview(reviewPayload);
  if (res && res.success) {
    document.getElementById("review-text").value = "";
    if (window.fetchAllData) await window.fetchAllData();
    ensureReviewsRendered();
  } else {
    alert("Failed to post review. Please try again.");
  }
  btn.textContent = "Post Review";
  btn.disabled = false;
}

// Call this after details render
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(ensureReviewsRendered, 500);
});
