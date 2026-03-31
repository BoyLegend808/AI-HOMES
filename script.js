// StudentHome - Main Application Script

// DOM Elements
const screens = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const featured = document.getElementById('featured');
const listingCards = document.getElementById('listingCards');
const adminListings = document.getElementById('adminListings');
const priceRange = document.getElementById('priceRange');
const priceValue = document.getElementById('priceValue');
const locationFilter = document.getElementById('locationFilter');
const typeFilter = document.getElementById('typeFilter');
const search = document.getElementById('search');
const adminSearch = document.getElementById('adminSearch');
const listingForm = document.getElementById('listingForm');
const requestInfo = document.getElementById('requestInfo');
const detailsTitle = document.getElementById('detailsTitle');
const detailsLocation = document.getElementById('detailsLocation');
const detailsPrice = document.getElementById('detailsPrice');
const detailsDesc = document.getElementById('detailsDesc');
const detailsMeta = document.getElementById('detailsMeta');
const detailsImage = document.getElementById('detailsImage');

// Screen Navigation
function activateScreen(screen) {
  screens.forEach((s) => s.classList.toggle('active', s.id === screen));
  navLinks.forEach((link) => link.classList.toggle('active', link.dataset.screen === screen));
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => activateScreen(link.dataset.screen));
});

// Render Card Template
const renderCard = (item) => `
  <article class="card-item" data-id="${item.id}">
    <img src="${item.photo || item.photos?.[0]}" alt="${item.title}" />
    <div class="card-body">
      <h3>${item.title}</h3>
      <p class="muted">${item.location} • ${item.type}</p>
      <p class="price">${window.formatPrice(item.price, true)}</p>
      <p class="details-meta">
        <span class="badge">${item.rooms} BR</span>
        <span class="badge">${item.status}</span>
      </p>
      <button class="btn action-btn" data-action="view" data-id="${item.id}">Open</button>
    </div>
  </article>
`;

// Refresh Lists
const refreshLists = () => {
  const listings = window.getListings();
  const cardHtml = listings.map(renderCard).join('');
  if (featured) featured.innerHTML = cardHtml;
  if (listingCards) listingCards.innerHTML = cardHtml;
  if (adminListings) {
    adminListings.innerHTML = listings.map((item) => `
      <div class="list-row">
        <h3>${item.title}</h3>
        <span class="status-pill">${item.status}</span>
      </div>
    `).join('');
  }
};

// Filter Data
function filterData() {
  const limit = Number(priceRange?.value || 1500);
  const locationVal = locationFilter?.value || 'all';
  const typeVal = typeFilter?.value || 'all';
  const q = search?.value?.trim().toLowerCase() || '';

  return window.getListings().filter((item) => {
    const priceOk = item.price <= limit;
    const locationOk = locationVal === 'all' || item.location === locationVal;
    const typeOk = typeVal === 'all' || item.type === typeVal;
    const textOk = q === '' || item.title.toLowerCase().includes(q) || item.location.toLowerCase().includes(q);
    return priceOk && locationOk && typeOk && textOk;
  });
}

// Apply Filters
function applyFilters() {
  const filtered = filterData();
  if (listingCards) listingCards.innerHTML = filtered.map(renderCard).join('');
  if (featured) featured.innerHTML = filtered.map(renderCard).join('');
}

// Event Listeners for Filters
if (priceRange) {
  priceRange.addEventListener('input', () => {
    if (priceValue) priceValue.textContent = '$' + priceRange.value;
    applyFilters();
  });
}

if (locationFilter) locationFilter.addEventListener('change', applyFilters);
if (typeFilter) typeFilter.addEventListener('change', applyFilters);
if (search) search.addEventListener('input', applyFilters);

// Admin Search
if (adminSearch) {
  adminSearch.addEventListener('input', () => {
    const q = adminSearch.value.toLowerCase();
    if (adminListings) {
      adminListings.innerHTML = window.getListings()
        .filter((item) => item.title.toLowerCase().includes(q) || item.status.toLowerCase().includes(q))
        .map((item) => `<div class="list-row"><h3>${item.title}</h3><span class="status-pill">${item.status}</span></div>`)
        .join('');
    }
  });
}

// Render Details
function renderDetails(item) {
  if (detailsTitle) detailsTitle.textContent = item.title;
  if (detailsLocation) detailsLocation.textContent = item.location;
  if (detailsPrice) detailsPrice.textContent = window.formatPrice(item.price, true);
  if (detailsDesc) detailsDesc.textContent = item.desc;
  if (detailsImage) detailsImage.src = item.photo || item.photos?.[0];
  if (detailsMeta) detailsMeta.innerHTML = item.amenities.map((a) => `<li>${a}</li>`).join('');
}

// Choose Item by ID
function chooseItemById(id) {
  const item = window.getListings().find((x) => String(x.id) === String(id));
  if (!item) return;
  renderDetails(item);
  activateScreen('details');
}

// Handle Card Actions
function handleCardActions(e) {
  const btn = e.target.closest('[data-action="view"]');
  if (!btn) return;
  const id = btn.dataset.id;
  chooseItemById(id);
}

if (featured) featured.addEventListener('click', handleCardActions);
if (listingCards) listingCards.addEventListener('click', handleCardActions);

// Request Info Button
if (requestInfo) {
  requestInfo.addEventListener('click', () => {
    alert('Request sent! Admin will contact you soon.');
  });
}

// Mobile Menu Toggle
function toggleMenu() {
  const navLinks = document.querySelector('.nav-links');
  const navOverlay = document.querySelector('.nav-overlay');
  const body = document.body;
  
  if (navLinks) navLinks.classList.toggle('menu-active');
  if (navOverlay) navOverlay.classList.toggle('menu-active');
  body.classList.toggle('menu-open');
}

// Initialize mobile menu functionality
document.addEventListener('DOMContentLoaded', () => {
  // Add click event to hamburger button
  const hamburgerBtn = document.querySelector('.mobile-menu-toggle');
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMenu();
    });
  }

  // Add click event to overlay
  const navOverlay = document.querySelector('.nav-overlay');
  if (navOverlay) {
    navOverlay.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMenu();
    });
  }

  // Close menu when clicking on a link
  const menuLinks = document.querySelectorAll('.nav-list a');
  menuLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const navLinks = document.querySelector('.nav-links');
      const navOverlay = document.querySelector('.nav-overlay');
      const body = document.body;
      
      if (navLinks) navLinks.classList.remove('menu-active');
      if (navOverlay) navOverlay.classList.remove('menu-active');
      body.classList.remove('menu-open');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const navLinks = document.querySelector('.nav-links');
    const toggle = document.querySelector('.mobile-menu-toggle');
    const navOverlay = document.querySelector('.nav-overlay');
    
    if (
      navLinks &&
      toggle &&
      !navLinks.contains(e.target) &&
      !toggle.contains(e.target) &&
      navLinks.classList.contains('menu-active')
    ) {
      navLinks.classList.remove('menu-active');
      if (navOverlay) navOverlay.classList.remove('menu-active');
      document.body.classList.remove('menu-open');
    }
  });
});

// Listing Form Submit
if (listingForm) {
  listingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(listingForm);
    const listing = {
      title: form.get('title'),
      location: form.get('location'),
      price: Number(form.get('price')),
      rooms: Number(form.get('rooms')),
      status: 'Active',
      type: form.get('type') || 'Shared',
      photo: form.get('photo'),
      desc: form.get('description'),
      amenities: Array.from(form.getAll('amenities')),
    };
    
    window.addListing(listing).then(() => {
        listingForm.reset();
        alert('Listing saved to Cloud.');
        window.location.reload();
    });
  });
}

// Initialize
window.renderShopGrid = refreshLists; // Link to cloud engine
refreshLists();
