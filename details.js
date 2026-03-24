const propertyData = {
  id: 1,
  title: "The Elm Street Shared House",
  location: "Sycamore",
  type: "Shared",
  price: 600,
  rooms: 3,
  status: "Active",
  photo:
    "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?fit=crop&w=840&q=80",
  description:
    "A comfortable student residence close to campus, with study rooms, high-speed internet, and laundry facilities.",
  amenities: ["WiFi", "Laundry", "Parking", "Study Rooms"],
};

const loadPropertyDetails = () => {
  document.getElementById("property-title").textContent = propertyData.title;
  document.getElementById("property-price").textContent =
    `$${propertyData.price}/mo`;
  document.getElementById("property-location").textContent =
    propertyData.location;
  document.getElementById("property-description").textContent =
    propertyData.description;

  const amenitiesList = document.getElementById("amenities-list");
  amenitiesList.innerHTML = propertyData.amenities
    .map((amenity) => `<li>${amenity}</li>`)
    .join("");

  document.getElementById("contact-btn").addEventListener("click", () => {
    alert("Contact request sent! We'll get back to you soon.");
  });

  document.getElementById("save-btn").addEventListener("click", () => {
    alert("Property saved to your favorites!");
  });
};

document.addEventListener("DOMContentLoaded", loadPropertyDetails);

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
