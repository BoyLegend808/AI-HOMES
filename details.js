const loadPropertyDetails = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  
  const propertyData = window.getListingById(id);
  
  if (!propertyData) {
    document.body.innerHTML = '<div style="padding:50px; text-align:center;"><h1>Property Not Found</h1><a href="shop.html">Back to Shop</a></div>';
    return;
  }

  document.getElementById("property-title").textContent = propertyData.title;
  document.getElementById("property-price").textContent =
    window.formatPrice(propertyData.price, true);
  document.getElementById("property-location").textContent =
    propertyData.location;
  document.getElementById("property-description").textContent =
    propertyData.desc || "No description provided.";

  const amenitiesList = document.getElementById("amenities-list");
  amenitiesList.innerHTML = (propertyData.amenities || [])
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
