const filterSchool = document.getElementById('flt-school');
const filterArea = document.getElementById('flt-area');
const filterType = document.getElementById('flt-type');
const shopContainer = document.getElementById('shop-container');

let allListings = [];
let isLoading = false;

function setLoadingState(state) {
  isLoading = !!state;
  if (!shopContainer) return;
  if (isLoading) {
    shopContainer.innerHTML = `
      <div class="shop-loading">
        <div class="loading-card"></div>
        <div class="loading-card"></div>
        <div class="loading-card"></div>
        <div class="loading-card"></div>
      </div>
    `;
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function populateSchoolOptions() {
  if (!filterSchool) return;

  const universities = window.NIGERIA_UNIVERSITIES || {};
  filterSchool.innerHTML = '<option value="">Select University</option>';

  Object.keys(universities).forEach((school) => {
    const option = document.createElement('option');
    option.value = school;
    option.textContent = school;
    filterSchool.appendChild(option);
  });
}

function populateTypeOptions() {
  if (!filterType) return;

  filterType.innerHTML = '<option value="">House Type</option>';

  (window.HOUSE_TYPES || []).forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    filterType.appendChild(option);
  });
}

function populateAreaOptions(selectedSchool) {
  if (!filterArea) return;

  filterArea.innerHTML = '<option value="">Select Area / Location</option>';

  const areas = (window.NIGERIA_UNIVERSITIES && window.NIGERIA_UNIVERSITIES[selectedSchool]) || [];
  areas.forEach((area) => {
    const option = document.createElement('option');
    option.value = area;
    option.textContent = area;
    filterArea.appendChild(option);
  });
}

function applyFilters() {
  if (window.getListings) {
    allListings = window.getListings();
  }
  const school = filterSchool ? filterSchool.value : '';
  const area = filterArea ? filterArea.value : '';
  const type = filterType ? filterType.value : '';

  const filtered = allListings.filter((listing) => {
    const location = String(listing.location || '').toLowerCase();
    let matches = true;

    if (school && !location.includes(school.toLowerCase())) matches = false;
    if (area && !location.includes(area.toLowerCase())) matches = false;
    if (type && listing.type !== type) matches = false;

    return matches;
  });

  renderShopGridView(filtered);
}

function renderShopGridView(listings) {
  if (!shopContainer) return;

  if (isLoading) return;
  if (!listings.length) {
    shopContainer.innerHTML = window.getEmptyStateHTML(
      'Oops! No houses found',
      "We couldn't find any pad matching those filters. Try searching for a different school or area."
    );
    return;
  }

  shopContainer.innerHTML = listings
    .map((listing) => {
      const image =
        listing.photo ||
        (listing.photos && listing.photos[0]) ||
        'https://via.placeholder.com/400x300?text=No+Image';
      const title = escapeHtml(listing.title);
      const location = escapeHtml(listing.location);
      const type = escapeHtml(listing.type);
      const detailsUrl = `details.html?id=${encodeURIComponent(listing.id)}`;

      return `
        <article class="list-card reveal" onclick="window.location.href='${detailsUrl}'">
          <img src="${image}" alt="${title}">
          <div class="list-info">
            <h3>${title}</h3>
            <div class="list-meta">${location}</div>
            <div class="list-price-row">
              <span class="list-price">${window.formatPrice(listing.price)}</span>
              <span class="list-type">${type}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  if (window.initReveal) window.initReveal();
}

document.addEventListener('DOMContentLoaded', () => {
  populateSchoolOptions();
  populateTypeOptions();
  allListings = window.getListings ? window.getListings() : [];
  if (!allListings.length) setLoadingState(true);
  renderShopGridView(allListings);

  if (!allListings.length && window.fetchAllData) {
    const maybePromise = window.fetchAllData();
    if (maybePromise && typeof maybePromise.finally === 'function') {
      maybePromise.finally(() => {
        setLoadingState(false);
        allListings = window.getListings ? window.getListings() : [];
        renderShopGridView(allListings);
      });
    }
  }
});

if (filterSchool) {
  filterSchool.addEventListener('change', (event) => {
    populateAreaOptions(event.target.value);
  });
}

window.applyFilters = applyFilters;
window.renderShopGrid = (listings) => {
  setLoadingState(false);
  allListings = Array.isArray(listings) ? listings : window.getListings();
  renderShopGridView(allListings);
};
