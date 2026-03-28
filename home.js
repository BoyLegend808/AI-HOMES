const STORAGE_KEY = "studenthome_listings";

const defaultData = [
  {
    id: 1,
    title: "The Elm Street Shared House",
    location: "Sycamore",
    type: "Shared",
    price: 600,
    rooms: 3,
    status: "Active",
    photo:
      "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?fit=crop&w=840&q=80",
  },
  {
    id: 2,
    title: "Lakeside Student Loft",
    location: "Oakridge",
    type: "Private",
    price: 950,
    rooms: 2,
    status: "Active",
    photo:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?fit=crop&w=840&q=80",
  },
  {
    id: 3,
    title: "Campus Central Studio",
    location: "Sycamore",
    type: "Private",
    price: 800,
    rooms: 1,
    status: "Hidden",
    photo:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?fit=crop&w=840&q=80",
  },
];

function getListings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : defaultData;
}

const data = getListings();

const featuredListings = document.getElementById("featured-listings");

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

const loadFeaturedListings = () => {
  featuredListings.innerHTML = data
    .slice(0, 3)
    .map(renderPropertyCard)
    .join("");
};

const searchForm = document.querySelector(".search-form");
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const location = e.target[0].value.toLowerCase();
  const maxPrice = parseInt(e.target[1].value) || 2000;
  const type = e.target[2].value;

  sessionStorage.setItem("searchLocation", location);
  sessionStorage.setItem("searchPrice", maxPrice);
  sessionStorage.setItem("searchType", type);

  window.location.href = "listings.html";
});

document.addEventListener("DOMContentLoaded", loadFeaturedListings);
const renderCard = (item) =>
  `<article class="list-card" tabindex="0"><img src="${item.photo}" alt="${item.title}" /><div class="list-card-content"><h3>${item.title}</h3><p class="text-muted">${item.location} · ${item.rooms} beds</p><p><span class="pill">$${item.price}/mo</span><span class="pill">${item.type}</span><span class="status">${item.status}</span></p></div></article>`;
const refresh = () => {
  featured.innerHTML = data.slice(0, 3).map(renderCard).join("");
  listingCards.innerHTML = data.map(renderCard).join("");
  adminListings.innerHTML = data
    .map(
      (it) =>
        `<article class="list-card" style="padding:.7rem;"><h3>${it.title}</h3><p class="text-muted">${it.location} · $${it.price}/mo · ${it.status}</p></article>`,
    )
    .join("");
};
refresh();

function toggleMenu() {
  const mobileMenu = document.getElementById("mobile-menu");
  mobileMenu.classList.toggle("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const menuLinks = document.querySelectorAll("#mobile-menu a");
  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      document.getElementById("mobile-menu").classList.remove("active");
    });
  });

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("mobile-menu");
    const toggle = document.querySelector(".mobile-menu-toggle");
    if (
      !menu.contains(e.target) &&
      !toggle.contains(e.target) &&
      menu.classList.contains("active")
    ) {
      menu.classList.remove("active");
    }
  });
});
