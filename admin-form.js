const listingForm = document.getElementById("listing-form");

listingForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const amenities = Array.from(formData.getAll("amenities")).join(", ");

  const newListing = {
    id: Date.now(),
    title: formData.get("title"),
    location: formData.get("location"),
    price: parseInt(formData.get("price")),
    rooms: parseInt(formData.get("rooms")),
    type: formData.get("type"),
    status: "Active",
    photo:
      formData.get("photo") ||
      "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?fit=crop&w=840&q=80",
    description: formData.get("description"),
    contact: formData.get("contact"),
    amenities: amenities,
  };

  // In a real app, this would be sent to a server
  console.log("New listing:", newListing);

  e.target.reset();
  alert("Listing saved successfully!");
});

function toggleMenu() {
  const mobileMenu = document.getElementById("mobile-menu");
  mobileMenu.classList.toggle("active");
}
