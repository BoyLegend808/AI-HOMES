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

function saveListings(listings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

function addListing(listing) {
  const listings = getListings();
  listing.id = Date.now();
  listings.push(listing);
  saveListings(listings);
}

function updateListing(id, updates) {
  const listings = getListings();
  const index = listings.findIndex(l => l.id === id);
  if (index !== -1) {
    listings[index] = { ...listings[index], ...updates };
    saveListings(listings);
  }
}

function getListingById(id) {
  return getListings().find(l => l.id == id);
}

const listingForm = document.getElementById("listing-form");

listingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  
  const formData = new FormData(e.target);
  const listing = {
    title: formData.get("title"),
    location: formData.get("location"),
    price: parseInt(formData.get("price")),
    rooms: parseInt(formData.get("rooms")),
    type: formData.get("type"),
    status: "Active",
    photo: formData.get("photo") || "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?fit=crop&w=840&q=80"
  };
  
  if (editId) {
    updateListing(parseInt(editId), listing);
  } else {
    addListing(listing);
  }
  
  alert('Listing saved successfully!');
  window.location.href = 'admin.html';
});

// Handle edit mode
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  
  if (editId) {
    const listing = getListingById(parseInt(editId));
    if (listing) {
      document.getElementById('title').value = listing.title;
      document.getElementById('location').value = listing.location;
      document.getElementById('price').value = listing.price;
      document.getElementById('rooms').value = listing.rooms;
      document.getElementById('type').value = listing.type;
      document.getElementById('photo').value = listing.photo;
    }
  }
});

function toggleMenu() {
  const mobileMenu = document.getElementById("mobile-menu");
  mobileMenu.classList.toggle("active");
}

document.addEventListener('DOMContentLoaded', () => {
  const menuLinks = document.querySelectorAll('#mobile-menu a');
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('mobile-menu').classList.remove('active');
    });
  });
  
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobile-menu');
    const toggle = document.querySelector('.mobile-menu-toggle');
    if (!menu.contains(e.target) && !toggle.contains(e.target) && menu.classList.contains('active')) {
      menu.classList.remove('active');
    }
  });
});
