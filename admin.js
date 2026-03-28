// StudentHome - Admin Dashboard Script
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

function deleteListing(id) {
  const listings = getListings();
  const filtered = listings.filter(l => l.id !== id);
  saveListings(filtered);
}

const data = getListings();

const listingsTableBody = document.getElementById('listings-body');
const searchInput = document.getElementById('search-listings');

const renderTableRow = (item) => `
  <tr>
    <td>${item.title}</td>
    <td>${item.location}</td>
    <td>$${item.price}</td>
    <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
    <td class="actions">
      <button class="btn btn-small btn-edit" data-id="${item.id}">Edit</button>
      <button class="btn btn-small btn-delete" data-id="${item.id}">Delete</button>
    </td>
  </tr>
`;

const loadListingsTable = (listings = data) => {
  if (listingsTableBody) {
    listingsTableBody.innerHTML = listings.map(item => `
      <tr>
        <td>${item.title}</td>
        <td>${item.location}</td>
        <td>$${item.price}</td>
        <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
        <td class="actions">
          <button class="btn btn-small btn-edit" data-id="${item.id}">Edit</button>
          <button class="btn btn-small btn-delete" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        window.location.href = `admin-form.html?edit=${id}`;
      });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Delete this listing?')) {
          const id = parseInt(e.target.dataset.id);
          deleteListing(id);
          loadListingsTable();
        }
      });
    });
  }
};

const filterListings = () => {
  const query = searchInput?.value?.toLowerCase() || '';
  const filtered = data.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.location.toLowerCase().includes(query) ||
    item.status.toLowerCase().includes(query)
  );
  loadListingsTable(filtered);
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
  
  loadListingsTable();
  if (searchInput) searchInput.addEventListener('input', filterListings);
});
