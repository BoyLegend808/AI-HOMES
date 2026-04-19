// StudentHome - Admin Form Script (Premium v2.0)

let editingId = null;
let backPage = "admin";
let uploadedPhotos = [];
let previewItems = [];
let previewCounter = 0;

const normalizeTextInput = (value) => String(value || "").trim();

const notify = (message, type = "info") => {
  if (window.showToast) {
    window.showToast(message, type);
    return;
  }
  alert(message);
};

const populateUnis = () => {
  const schoolSelect = document.getElementById("add-school");
  if (!schoolSelect) return;
  const savedVal = schoolSelect.value;
  schoolSelect.innerHTML = '<option value="">Select University</option>';
  const unis = window.getUniversities();
  Object.keys(unis).forEach((u) => {
    const op = document.createElement("option");
    op.value = u;
    op.textContent = u;
    schoolSelect.appendChild(op);
  });
  if (savedVal) schoolSelect.value = savedVal;
};

const populateAreas = (schoolName) => {
  const areaSelect = document.getElementById("add-area");
  if (!areaSelect) return;
  const savedVal = areaSelect.value;
  areaSelect.innerHTML = '<option value="">Select Area</option>';
  const unis = window.getUniversities();
  const areas = unis[schoolName] || [];
  areas.forEach((a) => {
    const op = document.createElement("option");
    op.value = a;
    op.textContent = a;
    areaSelect.appendChild(op);
  });
  if (savedVal) areaSelect.value = savedVal;
};

async function addNewSchool() {
  const name = prompt("Enter University Name:");
  if (!name) return;
  const res = await window.addUniversity(name);
  if (res?.success) {
    populateUnis();
    document.getElementById("add-school").value = name;
    populateAreas(name);
    notify("School added!", "success");
  }
}

async function addNewArea() {
  const school = document.getElementById("add-school").value;
  if (!school) return notify("Select a school first.", "error");

  const area = prompt(`New area for ${school}:`);
  if (!area) return;

  const res = await window.addAreaToUniversity(school, area);
  if (res?.success) {
    populateAreas(school);
    document.getElementById("add-area").value = area;
    notify("Area added!", "success");
  }
}

const createPreviewCard = (item) => {
  const card = document.createElement("div");
  card.className = "preview-card";
  card.dataset.previewId = item.id;

  const img = document.createElement("img");
  img.src = item.src;
  img.className = "preview-thumb";
  img.alt = item.isExisting ? "Existing photo" : "Uploaded preview";
  card.appendChild(img);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "preview-remove-btn";
  button.title = "Remove photo";
  button.textContent = "×";
  button.addEventListener("click", () => removePreviewItem(item.id));
  card.appendChild(button);

  return card;
};

const renderPreviewImages = () => {
  const container = document.getElementById("preview-container");
  if (!container) return;
  container.innerHTML = "";
  previewItems.forEach((item) =>
    container.appendChild(createPreviewCard(item)),
  );
};

const addPreviewItem = (src, file = null, url = "", isExisting = false) => {
  const id = `preview-${Date.now()}-${previewCounter++}`;
  previewItems.push({ id, src, file, url, isExisting });
  renderPreviewImages();
};

const removePreviewItem = (id) => {
  const index = previewItems.findIndex((item) => item.id === id);
  if (index === -1) return;
  previewItems.splice(index, 1);
  renderPreviewImages();
};

const handleFileUpload = (e) => {
  const files = Array.from(e.target.files);

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      addPreviewItem(event.target.result, file, "", false);
    };
    reader.readAsDataURL(file);
  });

  e.target.value = "";
};

const submitHouse = async () => {
  const btn = document.getElementById("btn-submit");
  const originalText = btn.textContent;

  const title = document.getElementById("add-title").value;
  const school = document.getElementById("add-school").value;
  const area = document.getElementById("add-area").value;
  const price = parseInt(document.getElementById("add-price").value);

  if (!title || !school || !area || !price) {
    return notify("Please fill all required fields.", "error");
  }

  btn.textContent = "Processing...";
  btn.disabled = true;

  try {
    const pendingFiles = previewItems
      .filter((item) => !item.isExisting)
      .map((item) => item.file)
      .filter(Boolean);
    uploadedPhotos = previewItems
      .filter((item) => item.isExisting)
      .map((item) => item.url)
      .filter(Boolean);

    if (pendingFiles.length > 0) {
      const urls = await Promise.all(
        pendingFiles.map((f) => window.uploadPhotoToStorage(f)),
      );
      urls.forEach((u) => {
        if (u) uploadedPhotos.push(u);
      });
    }

    if (uploadedPhotos.length === 0) {
      btn.textContent = originalText;
      btn.disabled = false;
      return notify("Please upload at least one photo.", "error");
    }

    const house = {
      title,
      school,
      area,
      price,
      exactLocation: document.getElementById("add-location").value,
      type: document.getElementById("add-type").value,
      rooms: parseInt(document.getElementById("add-rooms").value) || 1,
      contact: {
        phone: document.getElementById("add-phone").value,
        whatsapp: document.getElementById("add-wa").value,
      },
      description: document.getElementById("add-desc").value,
      photos: uploadedPhotos,
      photo: uploadedPhotos[0],
      location: `${area} (${school})`,
      status: "Active",
    };

    let res;
    if (editingId) {
      house.id = parseInt(editingId);
      res = await window.updateListing(house);
    } else {
      res = await window.addListing(house);
    }

    if (res.success) {
      notify("Property saved successfully!", "success");
      setTimeout(() => {
        window.location.href =
          backPage === "properties"
            ? "../admin/properties.html"
            : "../admin/admin.html";
      }, 1000);
    } else {
      throw new Error(res.error?.message);
    }
  } catch (err) {
    notify("Error: " + err.message, "error");
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const isAdmin = await window.ensureAdminAccess();
  if (!isAdmin) return;

  const formBody = document.getElementById("form-body");
  const formSkeleton = document.getElementById("form-skeleton");

  populateUnis();

  const typeSelect = document.getElementById("add-type");
  if (typeSelect) {
    typeSelect.innerHTML =
      '<option value="">Select Type</option>' +
      (window.HOUSE_TYPES || [])
        .map((t) => `<option value="${t}">${t}</option>`)
        .join("");
  }

  const urlParams = new URLSearchParams(window.location.search);
  editingId = urlParams.get("edit");
  backPage = urlParams.get("back") || "admin";

  if (editingId) {
    if (formSkeleton) formSkeleton.style.display = "grid";
    if (formBody) formBody.style.display = "none";

    if (window.fetchAllData) await window.fetchAllData();
    let house = window.getListingById(editingId);

    if (house) {
      document.getElementById("form-title").textContent = "Edit Property";
      document.getElementById("btn-submit").textContent = "Update Listing";

      document.getElementById("add-title").value = house.title;
      document.getElementById("add-location").value = house.exactLocation || "";
      document.getElementById("add-price").value = house.price;
      document.getElementById("add-rooms").value = house.rooms || 1;
      document.getElementById("add-type").value = house.type || "";
      document.getElementById("add-phone").value = house.contact?.phone || "";
      document.getElementById("add-wa").value = house.contact?.whatsapp || "";
      document.getElementById("add-desc").value =
        house.description || house.desc || "";

      document.getElementById("add-school").value = house.school;
      populateAreas(house.school);
      document.getElementById("add-area").value = house.area;

      if (house.photos?.length) {
        uploadedPhotos = [...house.photos];
        house.photos.forEach((src) => addPreviewItem(src, null, src, true));
      }
    }
  }

  if (formSkeleton) formSkeleton.style.display = "none";
  if (formBody) formBody.style.display = "block";

  document
    .getElementById("add-school")
    ?.addEventListener("change", (e) => populateAreas(e.target.value));
  document
    .getElementById("file-upload")
    ?.addEventListener("change", handleFileUpload);
  document.getElementById("btn-submit")?.addEventListener("click", submitHouse);
});
