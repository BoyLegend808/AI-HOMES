const data = [
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
  priceValue.textContent = `$${priceRange.value}`;
};

const filterListings = () => {
  const maxPrice = parseInt(priceRange.value);
  const selectedLocation = locationSelect.value;
  const selectedType = typeSelect.value;

  const filtered = data.filter(item => {
    return item.price <= maxPrice &&
           (selectedLocation === 'all' || item.location === selectedLocation) &&
           (selectedType === 'all' || item.type === selectedType);
  });

  listingsGrid.innerHTML = filtered.map(renderPropertyCard).join('');
};

const loadListings = () => {
  listingsGrid.innerHTML = data.map(renderPropertyCard).join('');
  updatePriceValue();
};

function toggleMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenu.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', () => {
  loadListings();
  priceRange.addEventListener('input', updatePriceValue);
  applyFiltersBtn.addEventListener('click', filterListings);
});
  );
  listingCards.innerHTML = filtered.map(renderCard).join("");
};
priceRange.addEventListener("input", updateListings);
locationFilter.addEventListener("change", updateListings);
typeFilter.addEventListener("change", updateListings);
updateListings();
