const renderPropertyCard = (item) => `
  <div class="property-card">
    <img src="${item.photo || item.photos?.[0]}" alt="${item.title}">
    <div class="content">
      <h3>${item.title}</h3>
      <div class="meta">${item.location} · ${item.rooms} beds</div>
      <div class="price">${window.formatPrice(item.price, true)}</div>
    </div>
  </div>
`;

const loadFeaturedListings = () => {
  const featuredListings = document.getElementById("featured-listings");
  if (!featuredListings) return;
  featuredListings.innerHTML = window
    .getListings()
    .slice(0, 3)
    .map(renderPropertyCard)
    .join("");
};

const searchForm = document.querySelector(".search-form");
if (searchForm) {
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const location = e.target[0].value.toLowerCase();
  const maxPrice = parseInt(e.target[1].value) || 2000;
  const type = e.target[2].value;

  sessionStorage.setItem("searchLocation", location);
  sessionStorage.setItem("searchPrice", maxPrice);
  sessionStorage.setItem("searchType", type);

  window.location.href = "shop.html";
});
}

document.addEventListener("DOMContentLoaded", loadFeaturedListings);
