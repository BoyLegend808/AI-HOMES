// StudentHome - Listings Page Script
const STORAGE_KEY = 'studenthome_listings';

const defaultData = [
  {
    id: 1,
    title: 'The Elm Street Shared House',
    location: 'Sycamore',
    type: 'Shared',
    price: 600,
    rooms: 3,
    status: 'Active',
    photo: 'https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?fit=crop&w=840&q=80'
  },
  {
    id: 2,
    title: 'Lakeside Student Loft',
    location: 'Oakridge',
    type: 'Private',
    price: 950,
    rooms: 2,
    status: 'Active',
    photo: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?fit=crop&w=840&q=80'
  },
  {
    id: 3,
    title: 'Campus Central Studio',
    location: 'Sycamore',
    type: 'Private',
    price: 800,
    rooms: 1,
    status: 'Hidden',
    photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?fit=crop&w=840&q=80'
  }
];

function getListings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : defaultData;
}

const data = getListings();

const listingsGrid = document.getElementById('listings-grid');
const priceRange = document.getElementById('price-range');
const priceValue = document.getElementById('price-value');
const locationSelect = document.getElementById('location');
const typeSelect = document.getElementById('type');
const applyFiltersBtn = document.getElementById('apply-filters');

const renderPropertyCard = (item) => `
  <div class="property-card">
    <img src="${item.photo}" alt="${item.title}">
    <div class="content">
      <h3>${item.title}</h3>
      <div class="meta">${item.location} · ${item.rooms} beds</div>
      <div class="price">$${item.price}/mo</div>
    </div>
  </div>
`;

const updatePriceValue = () => {
  if (priceValue && priceRange) {
    priceValue.textContent = `$${priceRange.value}`;
  }
};

const filterListings = () => {
  const maxPrice = parseInt(priceRange?.value || 1500);
  const selectedLocation = locationSelect?.value || 'all';
  const selectedType = typeSelect?.value || 'all';
  
  // Check for search params from home page
  const searchLocation = sessionStorage.getItem('searchLocation') || '';
  const searchPrice = parseInt(sessionStorage.getItem('searchPrice')) || 2000;
  const searchType = sessionStorage.getItem('searchType') || 'all';
  
  const filtered = data.filter(item => {
    const matchesPrice = item.price <= Math.min(maxPrice, searchPrice);
    const matchesLocation = selectedLocation === 'all' || 
      item.location.toLowerCase().includes(selectedLocation.toLowerCase()) ||
      item.location.toLowerCase().includes(searchLocation);
    const matchesType = selectedType === 'all' || 
      item.type === selectedType || 
      (searchType !== 'all' && item.type === searchType);
    
    return matchesPrice && matchesLocation && matchesType;
  });
  
  if (listingsGrid) {
    listingsGrid.innerHTML = filtered.map(renderPropertyCard).join('');
  }
  
  // Clear search params after use
  sessionStorage.removeItem('searchLocation');
  sessionStorage.removeItem('searchPrice');
  sessionStorage.removeItem('searchType');
};

const loadListings = () => {
  if (listingsGrid) {
    listingsGrid.innerHTML = data.map(renderPropertyCard).join('');
  }
  updatePriceValue();
};

function toggleMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const menuLinks = document.querySelectorAll('#mobile-menu a');
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu) mobileMenu.classList.remove('active');
    });
  });
  
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobile-menu');
    const toggle = document.querySelector('.mobile-menu-toggle');
    if (menu && toggle && !menu.contains(e.target) && !toggle.contains(e.target) && menu.classList.contains('active')) {
      menu.classList.remove('active');
    }
  });
  
  loadListings();
  if (priceRange) priceRange.addEventListener('input', updatePriceValue);
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', filterListings);
});
