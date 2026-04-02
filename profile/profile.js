document.addEventListener("DOMContentLoaded", async () => {
    // wait for auth
    const user = await window.fetchSessionUser();
    if(!user) {
        window.location.href = "../auth/auth.html";
        return;
    }

    document.getElementById("user-name").textContent = user.name;
    document.getElementById("user-email").textContent = user.email;
    document.getElementById("user-uni").textContent = user.university;

    loadSavedProperties();
});

async function loadSavedProperties() {
    const container = document.getElementById("saved-container");
    container.innerHTML = "<div class='empty-state'>Loading...</div>";

    if(!window.sb_client) {
        container.innerHTML = "<div class='empty-state'><p>Cloud offline. Cannot load favorites.</p></div>";
        return;
    }

    const session = await window.sb_client.auth.getUser();
    if(!session.data.user) return;

    const { data: favs, error } = await window.sb_client
        .from('favorites')
        .select('house_id')
        .eq('user_id', session.data.user.id);
    
    if(error || !favs || favs.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>No saved houses yet.</h3><p>Browse our shop to find your next home.</p><br><a href="../shop/shop.html" class="hero-btn">Browse Shop</a></div>`;
        return;
    }

    // Load available listings
    const allListings = window.getListings ? window.getListings() : [];
    if(allListings.length === 0 && window.fetchAllData) {
        await window.fetchAllData();
    }
    const listings = window.getListings();

    const savedListings = listings.filter(l => favs.some(f => String(f.house_id) === String(l.id)));

    if(savedListings.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>No saved houses yet.</h3><p>Browse our shop to find your next home.</p><br><a href="../shop/shop.html" class="hero-btn">Browse Shop</a></div>`;
        return;
    }

    container.innerHTML = savedListings.map(renderPropertyCard).join("");
}

const renderPropertyCard = (item) => `
  <article class="list-card" onclick="window.location.href='../details/detail.html?id=${encodeURIComponent(item.id)}'">
    <img loading="lazy" src="${item.photo || item.photos?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${item.title}">
    <div class="list-info">
      <h3>${item.title}</h3>
      <div class="list-meta">${item.location}</div>
      <div class="list-price-row">
        <span class="list-price">${window.formatPrice(item.price)}</span>
        <span class="list-type">${item.type}</span>
      </div>
    </div>
  </article>
`;
