// StudentHome - Admin Dashboard Script

const listingsTableBody = document.getElementById('listings-body');
const searchInput = document.getElementById('search-listings');

const renderTableRow = (item) => `
  <tr>
    <td>${item.title}</td>
    <td>${item.location}</td>
    <td>${window.formatPrice(item.price)}</td>
    <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
    <td class="actions">
      <button class="btn btn-small btn-edit" data-id="${item.id}">Edit</button>
      <button class="btn btn-small btn-delete" data-id="${item.id}">Delete</button>
    </td>
  </tr>
`;

const loadListingsTable = (listings) => {
  if (!listings) listings = window.getListings();
  if (listingsTableBody) {
    listingsTableBody.innerHTML = listings.map(item => `
      <tr>
        <td>${item.title}</td>
        <td>${item.location}</td>
        <td>${window.formatPrice(item.price)}</td>
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
          window.deleteListing(id).then(() => {
            window.location.reload();
          });
        }
      });
    });
  }
};

const filterListings = () => {
  const query = searchInput?.value?.toLowerCase() || '';
  const filtered = window.getListings().filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.location.toLowerCase().includes(query) ||
    item.status.toLowerCase().includes(query)
  );
  loadListingsTable(filtered);
};

document.addEventListener('DOMContentLoaded', () => {
  window.renderDashboard = loadListingsTable;
  loadListingsTable();
  if (searchInput) searchInput.addEventListener('input', filterListings);
});
