let editingId = null;
let backPage = "admin";
let uploadedPhotos = []; // Holds the final URLs 
let pendingFiles = []; // Holds actual files waiting to be uploaded to Bucket

const normalizeTextInput = (value) => String(value || "").trim();

const ensureUniqueArea = (areas, candidate) => {
  const normalized = candidate.toLowerCase();
  return !areas.some((a) => String(a).toLowerCase() === normalized);
};

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
  schoolSelect.innerHTML = '<option value="">Select School</option>';
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
  const name = normalizeTextInput(prompt("Enter the new school name"));
  if (!name) return;

  const unis = window.getUniversities ? window.getUniversities() : {};
  if (Object.keys(unis).some((u) => u.toLowerCase() === name.toLowerCase())) {
    notify("That school already exists.", "error");
    populateUnis();
    const schoolSelect = document.getElementById("add-school");
    if (schoolSelect) schoolSelect.value = name;
    populateAreas(name);
    return;
  }

  const res = await window.addUniversity(name);
  if (!res?.success) {
    notify(
      "Add School Error: " + (res?.error?.message || "Unable to save."),
      "error",
    );
    return;
  }

  populateUnis();
  const schoolSelect = document.getElementById("add-school");
  if (schoolSelect) schoolSelect.value = name;
  populateAreas(name);
  notify("School added successfully.", "success");
}

async function addNewArea() {
  const schoolSelect = document.getElementById("add-school");
  const school = normalizeTextInput(schoolSelect?.value);
  if (!school) {
    notify("Select a school first.", "error");
    return;
  }

  const area = normalizeTextInput(prompt(`Enter a new area for ${school}`));
  if (!area) return;

  const unis = window.getUniversities ? window.getUniversities() : {};
  const currentAreas = unis[school] || [];
  if (!ensureUniqueArea(currentAreas, area)) {
    notify("That area already exists for this school.", "error");
    populateAreas(school);
    const areaSelect = document.getElementById("add-area");
    if (areaSelect) areaSelect.value = area;
    return;
  }

  const res = await window.addAreaToUniversity(school, area);
  if (!res?.success) {
    notify("Add Area Error: " + (res?.error?.message || "Unable to save."), "error");
    return;
  }

  populateAreas(school);
  const areaSelect = document.getElementById("add-area");
  if (areaSelect) areaSelect.value = area;
  notify("Area added successfully.", "success");
}

// Handle photo uploads
const handleFileUpload = (e) => {
  const files = Array.from(e.target.files);
  const container = document.getElementById("preview-container");
  const label = document.getElementById("upload-label");

  files.forEach((file) => {
    pendingFiles.push(file); // Save the raw file for the "Submit" step

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      // We ONLY use base64 here to show a quick UI preview, not for the database
      const div = document.createElement("div");
      div.style =
        "width:100px; height:80px; position:relative; border-radius:8px; overflow:hidden; border:1px solid var(--accent);";
      div.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
      container.appendChild(div);
      if (label) label.style.display = "none";
    };
    reader.readAsDataURL(file);
  });
};

const submitHouse = async () => {
  const title = document.getElementById("add-title").value;
  const school = document.getElementById("add-school").value;
  const area = document.getElementById("add-area").value;
  const exactLocation = document.getElementById("add-location").value;
  const type = document.getElementById("add-type").value;
  const price = parseInt(document.getElementById("add-price").value);
  const rooms = parseInt(document.getElementById("add-rooms").value) || 1;
  const phone = document.getElementById("add-phone").value;
  const whatsapp = document.getElementById("add-wa").value;
  const desc = document.getElementById("add-desc").value;

  const btn = document.getElementById("btn-submit");
  btn.textContent = "Uploading Photos...";
  btn.disabled = true;

  // 1. Upload files to our 'Photo Album' (Storage Bucket) FIRST
  try {
    for (const file of pendingFiles) {
      const url = await window.uploadPhotoToStorage(file);
      if (url) {
        uploadedPhotos.push(url);
      }
    }
  } catch (err) {
    alert("Could not upload photos. Check your internet or bucket permissions.");
    btn.textContent = "Submit Listing";
    btn.disabled = false;
    return;
  }

  // If no photos exist at all
  if (!title || !school || !area || !price || uploadedPhotos.length === 0) {
    alert("Please fill required details and upload photos.");
    btn.textContent = "Submit Listing";
    btn.disabled = false;
    return;
  }

  // 2. Add the short URL links to our Notebook (Database)
  const house = {
    title,
    school,
    area,
    exactLocation,
    type,
    price,
    rooms,
    status: "Active",
    photos: uploadedPhotos,
    photo: uploadedPhotos[0], // Main display image
    location: `${area} (${school})`, // Combined string for display/search
    description: desc,
    desc: desc, // Alias for older components
    contact: { phone, whatsapp },
  };

  btn.textContent = "Saving to Database...";

  if (editingId) {
    house.id = parseInt(editingId);
    const res = await window.updateListing(house);
    if (!res.success) alert("Update Error: " + res.error?.message);
    else {
      if (window.fetchAllData) await window.fetchAllData();
      alert("Property Updated Successfully!");
    }
  } else {
    const res = await window.addListing(house);
    if (!res.success) alert("Listing Error: " + res.error?.message);
    else alert("Property Listed Successfully!");
  }
  const target =
    backPage === "properties" ? "../admin/properties.html" : "../admin/admin.html";
  window.location.href = target;
};

document.addEventListener("DOMContentLoaded", async () => {
  const isAdmin = await window.ensureAdminAccess();
  if (!isAdmin) return;

  const formBody = document.getElementById("form-body");
  const formSkeleton = document.getElementById("form-skeleton");
  const toggleSkeleton = (show) => {
    if (formSkeleton) formSkeleton.style.display = show ? "grid" : "none";
    if (formBody) formBody.style.display = show ? "none" : "";
  };

  populateUnis();

  const typeSelect = document.getElementById("add-type");
  if (typeSelect) {
    typeSelect.innerHTML =
      '<option value="">Select Type</option>' +
      (window.HOUSE_TYPES || [])
        .map((t) => `<option value="${t}">${t}</option>`)
        .join("");
  }

  const schoolSelect = document.getElementById("add-school");
  if (schoolSelect)
    schoolSelect.addEventListener("change", (e) =>
      populateAreas(e.target.value),
    );

  const fileInput = document.getElementById("file-upload");
  if (fileInput) fileInput.addEventListener("change", handleFileUpload);

  const submitBtn = document.getElementById("btn-submit");
  if (submitBtn) submitBtn.addEventListener("click", submitHouse);

  const urlParams = new URLSearchParams(window.location.search);
  editingId = urlParams.get("edit");
  backPage = urlParams.get("back") || "admin";

  const backLinkEl = document.getElementById("back-link");
  if (backLinkEl) {
    backLinkEl.href =
      backPage === "properties" ? "../admin/properties.html" : "../admin/admin.html";
  }

  const formTitleEl = document.getElementById("form-title");
  const formSubTextEl = formTitleEl?.closest(".header-content")?.querySelector("p");
  const submitBtnEl = document.getElementById("btn-submit");

  if (editingId) {
    toggleSkeleton(true);
    if (formTitleEl) formTitleEl.textContent = "Edit Property";
    if (formSubTextEl)
      formSubTextEl.textContent = "Update listing details and gallery photos.";
    if (submitBtnEl) submitBtnEl.textContent = "Save Changes";

    // Ensure cached houses exist (best case)
    if (window.fetchAllData) {
      await window.fetchAllData();
    }

    // Prefer cache, but fall back to DB fetch if cache isn't ready.
    let listing = window.getListingById(editingId);
    if (!listing && window.getListingByIdFromDb) {
      listing = await window.getListingByIdFromDb(editingId);
    }

    if (!listing) {
      notify("Property not found. It may have been deleted.", "error");
      toggleSkeleton(false);
      return;
    }

    document.getElementById("add-title").value = listing.title;
    document.getElementById("add-location").value =
      listing.exactLocation || "";
    document.getElementById("add-price").value = listing.price;
    document.getElementById("add-rooms").value = listing.rooms || 1;
    document.getElementById("add-type").value = listing.type;
    document.getElementById("add-phone").value = listing.contact?.phone || "";
    document.getElementById("add-wa").value = listing.contact?.whatsapp || "";
    document.getElementById("add-desc").value =
      listing.description || listing.desc || "";

    document.getElementById("add-school").value = listing.school;
    populateAreas(listing.school);
    document.getElementById("add-area").value = listing.area;

    // Photos
    if (listing.photos && listing.photos.length > 0) {
      uploadedPhotos = listing.photos;
      const container = document.getElementById("preview-container");
      const label = document.getElementById("upload-label");
      if (label) label.style.display = "none";

      listing.photos.forEach((img) => {
        const div = document.createElement("div");
        div.style =
          "width:100px; height:80px; position:relative; border-radius:8px; overflow:hidden; border:1px solid var(--accent);";
        div.innerHTML = `<img src="${img}" style="width:100%; height:100%; object-fit:cover;">`;
        container.appendChild(div);
      });
    }

    toggleSkeleton(false);
  } else {
    if (formTitleEl) formTitleEl.textContent = "Property Creator";
    if (formSubTextEl)
      formSubTextEl.textContent = "Create full property details and upload gallery photos.";
    if (submitBtnEl) submitBtnEl.textContent = "Publish Property";
    toggleSkeleton(false);
  }
});
