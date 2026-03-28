// StudentHome - Main Application Script
const STORAGE_KEY = "studenthome_listings";

// Default listing data
const defaultData = [
  {
    id: 1,
    title: "The Elm Street Shared House",
    location: "Sycamore",
    type: "Shared",
    price: 600,
    rooms: 3,
    status: "Active",
    photo: "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?fit=crop&w=840&q=80",
    desc: "Shared house with utilities included, 10 min from campus",
    amenities: ["WiFi", "Laundry", "Parking"]
  },
  {
    id: 2,
    title: "Lakeside Student Loft",
    location: "Oakridge",
    type: "Private",
    price: 950,
    rooms: 2,
    status: "Active",
    photo: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?fit=crop&w=840&q=80",
    desc: "Modern loft with lake view and study area",
    amenities: ["WiFi", "Study Room", "Parking"]
  },
  {
    id: 3,
    title: "Campus Central Studio",
    location: "Campus",
    type: "Studio",
    price: 800,
    rooms: 1,
    status: "Hidden",
    photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?fit=crop&w=840&q=80",
    desc: "Cozy studio near campus with quick access and security",
    amenities: ["WiFi", "Laundry"]
  }
];

// Initialize data
let data = [...defaultData];

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
    <img src="${item.photo}" alt="${item.title}" />
    <div class="card-body">
      <h3>${item.title}</h3>
      <p class="muted">${item.location} • ${item.type}</p>
      <p class="price">$${item.price}/mo</p>
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
  const cardHtml = data.map(renderCard).join('');
  if (featured) featured.innerHTML = cardHtml;
  if (listingCards) listingCards.innerHTML = cardHtml;
  if (adminListings) {
    adminListings.innerHTML = data.map((item) => `
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

  return data.filter((item) => {
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
      adminListings.innerHTML = data
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
  if (detailsPrice) detailsPrice.textContent = `$${item.price}/mo`;
  if (detailsDesc) detailsDesc.textContent = item.desc;
  if (detailsImage) detailsImage.src = item.photo;
  if (detailsMeta) detailsMeta.innerHTML = item.amenities.map((a) => `<li>${a}</li>`).join('');
}

// Choose Item by ID
function chooseItemById(id) {
  const item = data.find((x) => x.id === Number(id));
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

// Listing Form Submit
if (listingForm) {
  listingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(listingForm);
    const amenities = Array.from(form.getAll('amenities'));
    
    data.push({
      id: Date.now(),
      title: form.get('title'),
      location: form.get('location'),
      price: Number(form.get('price')),
      rooms: Number(form.get('rooms')),
      status: 'Active',
      type: 'Shared',
      photo: form.get('photo') || 'https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?fit=crop&w=840&q=80',
      desc: form.get('description') || 'No description available',
      amenities,
    });
    
    listingForm.reset();
    refreshLists();
    alert('Listing saved.');
    activateScreen('admin');
  });
}

// Initialize
refreshLists();
