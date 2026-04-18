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
    
    if(user.avatar_url) {
        document.getElementById("header-avatar").innerHTML = `<img src="${user.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
    }

    window.renderSavedProperties();
});

window.renderSavedProperties = async () => {
    const container = document.getElementById("saved-container");
    if(!container) return;
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
    const listings = window.getListings ? window.getListings() : [];
    const savedListings = listings.filter(l => favs.some(f => String(f.house_id) === String(l.id)));

    if(savedListings.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>No saved houses yet.</h3><p>Browse our shop to find your next home.</p><br><a href="../shop/shop.html" class="hero-btn">Browse Shop</a></div>`;
        return;
    }

    container.innerHTML = savedListings.map(renderPropertyCard).join("");
}

const renderPropertyCard = (item) => `
  <article class="list-card" onclick="window.location.href='../details/detail.html?id=${encodeURIComponent(item.id)}'" style="position:relative;">
    <button class="bookmarkBtn active" data-house-id="${item.id}" 
      style="top:10px; right:10px;"
      onclick="event.stopPropagation(); window.removeFromFavorites(${item.id})">
        <span class="IconContainer">
          <svg viewBox="0 0 384 512" height="0.9em" class="icon"><path d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"></path></svg>
        </span>
        <p class="text">Save</p>
    </button>
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

window.openEditModal = async () => {
    const user = await window.fetchSessionUser();
    if(!user) return;

    document.getElementById("edit-name").value = user.name || "";
    document.getElementById("edit-phone").value = user.phone || "";
    
    if(user.avatar_url) {
        document.getElementById("edit-avatar-preview").innerHTML = `<img src="${user.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
    }

    const uniSelect = document.getElementById("edit-uni");
    if(uniSelect && window.getUniversities) {
        const unis = Object.keys(window.getUniversities());
        uniSelect.innerHTML = '<option value="">Select University</option>' + 
            unis.map(u => `<option value="${u}" ${u === user.university ? 'selected' : ''}>${u}</option>`).join("");
    }

    document.getElementById("edit-modal").style.display = "flex";
};

window.previewAvatar = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById("edit-avatar-preview").innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
        };
        reader.readAsDataURL(file);
    }
};

window.closeEditModal = () => {
    document.getElementById("edit-modal").style.display = "none";
};

async function uploadAvatar(file, userId) {
    if(!window.sb_client) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await window.sb_client.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = window.sb_client.storage
        .from('avatars')
        .getPublicUrl(filePath);

    return publicUrl;
}

window.saveProfile = async () => {
    if(!window.sb_client) return;
    const name = document.getElementById("edit-name").value.trim();
    const uni = document.getElementById("edit-uni").value;
    const phone = document.getElementById("edit-phone").value.trim();
    const avatarFile = document.getElementById("edit-avatar-input").files[0];

    if(!name) {
        if(window.showToast) window.showToast("Name is required", "error");
        return;
    }

    try {
        const { data: { user } } = await window.sb_client.auth.getUser();
        if(!user) return;

        let avatarUrl = null;
        if(avatarFile) {
            if(window.showToast) window.showToast("Uploading picture...", "info");
            avatarUrl = await uploadAvatar(avatarFile, user.id);
        }

        const updates = {
            full_name: name,
            university: uni,
            phone: phone
        };

        if(avatarUrl) updates.avatar_url = avatarUrl;

        const { error } = await window.sb_client
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if(!error) {
            if(window.showToast) window.showToast("Profile updated successfully!", "success");
            closeEditModal();
            // Refresh UI
            const updated = await window.fetchSessionUser();
            document.getElementById("user-name").textContent = updated.name;
            document.getElementById("user-uni").textContent = updated.university;
            if(updated.avatar_url) {
                document.getElementById("header-avatar").innerHTML = `<img src="${updated.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
                document.getElementById("edit-avatar-preview").innerHTML = `<img src="${updated.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
            }
        } else {
            throw error;
        }
    } catch (err) {
        if(window.showToast) window.showToast("Update failed: " + err.message, "error");
    }
};
