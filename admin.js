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

const listingsTableBody = document.getElementById('listings-body');
const searchInput = document.getElementById('search-listings');

const renderTableRow = (item) => `
  <tr>
    <td>${item.title}</td>
    <td>${item.location}</td>
    <td>$${item.price}</td>
    <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
    <td class="actions">
      <button class="btn btn-small btn-edit">Edit</button>
      <button class="btn btn-small btn-delete">Delete</button>
    </td>
  </tr>
`;

const loadListingsTable = (listings = data) => {
  listingsTableBody.innerHTML = listings.map(renderTableRow).join('');
};

const filterListings = () => {
  const query = searchInput.value.toLowerCase();
  const filtered = data.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.location.toLowerCase().includes(query) ||
    item.status.toLowerCase().includes(query)
  );
  loadListingsTable(filtered);
};

document.addEventListener('DOMContentLoaded', () => {
  loadListingsTable();
  searchInput.addEventListener('input', filterListings);
});
      (it) =>
        it.title.toLowerCase().includes(query) ||
        it.status.toLowerCase().includes(query),
    )
    .map(
      (it) =>
        `<article class="list-card"><h3>${it.title}</h3><p class="text-muted">${it.location} · $${it.price}/mo · ${it.status}</p></article>`,
    )
    .join("");
});
