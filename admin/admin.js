// StudentHome - Admin Dashboard Script (Premium v2.0)

function setAdminLoading(isLoading) {
  const loadingEl = document.getElementById("admin-loading");
  const tableWrap = document.querySelector(".listings-table-container");
  const uniLoadingEl = document.getElementById("uni-loading");
  const uniCardsEl = document.getElementById("uni-cards");

  if (loadingEl) loadingEl.style.display = isLoading ? "flex" : "none";
  if (tableWrap) tableWrap.style.display = isLoading ? "none" : "";

  if (uniLoadingEl) uniLoadingEl.style.display = isLoading ? "flex" : "none";
  if (uniCardsEl)
    uniCardsEl.style.display = isLoading ? "none" : "grid";
}

async function waitForHousesReady({ timeoutMs = 8000 } = {}) {
  if (window.hasFetchedHouses) return true;
  const start = Date.now();
  return await new Promise((resolve) => {
    const tick = () => {
      if (window.hasFetchedHouses) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);
      setTimeout(tick, 120);
    };
    tick();
  });
}

async function renderDashboard() {
  let allListings = [];
  if (window.fetchAdminHouses) {
    allListings = await window.fetchAdminHouses();
  } else {
    allListings = window.getListings ? window.getListings() : [];
  }

  const propCountEl = document.getElementById("prop-count");
  if (propCountEl) propCountEl.textContent = allListings.length;
  
  const activeCountEl = document.getElementById("active-count");
  if (activeCountEl) {
    activeCountEl.textContent = allListings.filter((h) => h.status === "Active").length;
  }

  const uniCountSource = (window.getUniversities && window.getUniversities()) || window.NIGERIA_UNIVERSITIES || {};
  const uniCountEl = document.getElementById("uni-count");
  if (uniCountEl) uniCountEl.textContent = Object.keys(uniCountSource).length;
  
  if (window.renderUniversities) window.renderUniversities();
}
window.renderDashboard = renderDashboard;

window.updateUniLogoScale = async (uniId, scale) => {
  const card = document.querySelector(`.uni-card[data-id="${uniId}"]`);
  if (card) {
    const img = card.querySelector("img");
    if (img) img.style.transform = `scale(${scale})`;
  }

  if (window.updateUniversityLogoScale) {
    await window.updateUniversityLogoScale(uniId, scale);
  }
};

window.triggerUniLogoUpload = (uniId) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file && window.uploadPhotoToStorage && window.updateUniversityLogo) {
      if (window.showToast) window.showToast("Uploading logo...", "info");
      try {
        const url = await window.uploadPhotoToStorage(file);
        if (url) {
          const res = await window.updateUniversityLogo(uniId, url);
          if (res.success) {
            if (window.showToast) window.showToast("Logo updated!", "success");
            if (window.fetchAllData) await window.fetchAllData();
            renderUniversities();
          }
        }
      } catch (err) {
        console.error("Logo Upload Error:", err);
        if (window.showToast) window.showToast("Upload failed: " + err.message, "error");
      }
    }
  };
  input.click();
};

window.removeUniversity = async (uniId) => {
  if (!confirm("Remove this university and all its areas?")) return;
  if (window.sb_client) {
    const { error } = await window.sb_client.from("universities").delete().eq("id", uniId);
    if (!error) {
       if (window.fetchAllData) await window.fetchAllData();
       renderUniversities();
    }
  }
};

window.addAreaToUni = async (uniId) => {
  const area = prompt("Enter new area name:");
  if (!area) return;
  if (window.sb_client) {
    const { data } = await window.sb_client.from("universities").select("locations").eq("id", uniId).single();
    const currentAreas = data?.locations || [];
    if (currentAreas.includes(area)) return alert("Area already exists!");
    const { error } = await window.sb_client.from("universities").update({ locations: [...currentAreas, area] }).eq("id", uniId);
    if (!error) {
       if (window.fetchAllData) await window.fetchAllData();
       renderUniversities();
    }
  }
};

window.removeAreaFromUni = async (uniId, areaName) => {
  if (!confirm(`Remove "${areaName}"?`)) return;
  if (window.sb_client) {
    const { data } = await window.sb_client.from("universities").select("locations").eq("id", uniId).single();
    const updatedAreas = (data?.locations || []).filter((a) => a !== areaName);
    const { error } = await window.sb_client.from("universities").update({ locations: updatedAreas }).eq("id", uniId);
    if (!error) {
       if (window.fetchAllData) await window.fetchAllData();
       renderUniversities();
    }
  }
};

window.addNewUniversity = async () => {
  const name = prompt("Enter University Name:");
  if (!name) return;
  if (window.sb_client) {
    const { error } = await window.sb_client.from("universities").insert([{ name, locations: [], logo_url: "", logo_scale: 1.1 }]);
    if (!error) {
      if (window.fetchAllData) await window.fetchAllData();
      renderUniversities();
    }
  }
};

window.renderUniversities = () => {
  const uniCards = document.getElementById("uni-cards");
  if (!uniCards) return;

  const cloudUnis = window.CLOUD_UNIVERSITIES_DATA || [];
  if (cloudUnis.length === 0) {
    uniCards.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:3rem;">No university partners added yet.</p>';
    return;
  }

  uniCards.innerHTML = cloudUnis
    .map(
      (u) => `
        <div class="uni-card" data-id="${u.id}">
            <div class="uni-logo-box">
                <img loading="lazy" decoding="async" src="${u.logo_url || "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?q=80&w=200&auto=format&fit=crop"}"
                     style="transform: scale(${u.logo_scale || 1.1});">
            </div>
            <h3>${u.name}</h3>
            <div style="display:flex; gap:0.5rem; justify-content:center; margin-bottom:1.5rem;">
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size:0.75rem;" onclick="triggerUniLogoUpload(${u.id})">Update Logo</button>
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size:0.75rem; color:#f43f5e;" onclick="removeUniversity(${u.id})">Delete</button>
            </div>

            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius:12px; margin-bottom:1.5rem;">
                <label style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:0.5rem;">Logo Scale: ${u.logo_scale || 1.1}x</label>
                <input type="range" min="0.5" max="2.5" step="0.1" value="${u.logo_scale || 1.1}"
                       style="width:100%; accent-color:var(--accent);"
                       oninput="updateUniLogoScale(${u.id}, this.value)">
            </div>

            <div style="text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Campus Areas</span>
                    <button class="btn-accent-sm" onclick="addAreaToUni(${u.id})" style="padding:0.2rem 0.4rem;">+ Add</button>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                    ${(u.locations || [])
                      .map(area => `
                        <span style="font-size:0.75rem; background:rgba(255,255,255,0.03); padding:0.25rem 0.6rem; border-radius:8px; display:inline-flex; align-items:center; gap:6px; border:1px solid var(--card-border);">
                            ${area}
                            <span onclick="removeAreaFromUni(${u.id}, '${area}')" style="cursor:pointer; color:#f43f5e; font-weight:bold;">×</span>
                        </span>
                      `).join("")}
                    ${!u.locations?.length ? '<span style="color:var(--text-muted); font-size:0.75rem; font-style:italic;">None</span>' : ""}
                </div>
            </div>
        </div>
    `,
    ).join("");
};

async function renderInquiries() {
  const body = document.getElementById("inquiries-body");
  if (!body || !window.sb_client) return;

  const { data, error } = await window.sb_client
    .from('inquiries')
    .select('*, houses(title)')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    if (body) body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:3rem; color:var(--text-muted);">No student inquiries found.</td></tr>';
    return;
  }

  const userIds = data.map(i => i.user_id).filter(id => id);
  if (userIds.length > 0) {
    const { data: profiles } = await window.sb_client
      .from('profiles')
      .select('id, full_name, email, phone, university')
      .in('id', userIds);
    if (profiles) {
      data.forEach(inq => {
        inq.profiles = profiles.find(p => p.id === inq.user_id);
      });
    }
  }

  body.innerHTML = data.map(inq => `
    <tr>
      <td>
        <div style="font-weight:700; color:#fff;">${inq.profiles?.full_name || 'Anonymous Student'}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${inq.profiles?.phone || inq.profiles?.email || 'No contact'}</div>
      </td>
      <td><div style="color:var(--text-muted); font-size:0.9rem;">${inq.houses?.title || 'General Inquiry'}</div></td>
      <td><div class="message-cell">${inq.message}</div></td>
      <td style="font-size:0.8rem; color:var(--text-muted);">${new Date(inq.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

document.addEventListener("DOMContentLoaded", async () => {
  const isAdmin = await window.ensureAdminAccess();
  if (!isAdmin) return;
  setAdminLoading(true);
  try {
    await waitForHousesReady();
    await renderDashboard();
    renderUniversities();
    renderInquiries();
  } catch (e) {
    console.error(e);
  } finally {
    setAdminLoading(false);
  }

});
