// StudentHome - Admin Form Script (Premium v2.0)

let editingId = null;
let backPage = "admin";
let uploadedPhotos = [];
let previewItems = [];
let previewCounter = 0;

// Video upload variables
let uploadedVideoFile = null;
let uploadedVideoUrl = null;
let uploadedVideoThumbnail = null;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

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
  const rawName = prompt("Enter University Name:");
  if (rawName === null) return;
  const name = window.Security ? window.Security.sanitizeInput(rawName, 100) : rawName.trim();
  if (!name || name.length < 2) {
    return notify("Invalid school name (must be at least 2 characters).", "error");
  }
  // Sanity check for allowed characters
  if (!/^[a-zA-Z0-9\s().,\-&]+$/.test(name)) {
    return notify("Invalid characters in school name.", "error");
  }

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

  const rawArea = prompt(`New area for ${school}:`);
  if (rawArea === null) return;
  const area = window.Security ? window.Security.sanitizeInput(rawArea, 100) : rawArea.trim();
  if (!area || area.length < 2) {
    return notify("Invalid area name (must be at least 2 characters).", "error");
  }
  if (!/^[a-zA-Z0-9\s().,\-&]+$/.test(area)) {
    return notify("Invalid characters in area name.", "error");
  }

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

// Video Upload Functions
const handleVideoUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const videoUploadLabel = document.getElementById("video-upload-label");
  const videoPreviewContainer = document.getElementById("video-preview-container");
  const videoPreview = document.getElementById("video-preview");

  // Validate file type
  const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];
  if (!allowedTypes.includes(file.type)) {
    notify("Please upload a valid video file (MP4, WebM, or OGG)", "error");
    return;
  }

  // Validate file size
  if (file.size > MAX_VIDEO_SIZE) {
    notify(
      `Video is too large. Maximum size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      "error"
    );
    return;
  }

  uploadedVideoFile = file;

  // Show preview
  const videoURL = URL.createObjectURL(file);
  videoPreview.src = videoURL;
  videoPreviewContainer.style.display = "block";
  videoUploadLabel.style.display = "none";

  // Generate thumbnail
  await generateVideoThumbnail(file);
  notify("Video uploaded successfully!", "success");
};

const generateVideoThumbnail = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);

    video.onloadeddata = () => {
      video.currentTime = 1;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (blob) {
          const thumbnailFileName = `thumbnails/${Date.now()}_thumb.jpg`;
          const { data, error } = await window.sb_client.storage
            .from("house-photos")
            .upload(thumbnailFileName, blob, {
              contentType: "image/jpeg",
              cacheControl: "3600",
            });

          if (!error) {
            const { data: urlData } = window.sb_client.storage
              .from("house-photos")
              .getPublicUrl(thumbnailFileName);
            uploadedVideoThumbnail = urlData.publicUrl;
          }
        }
        resolve();
      }, "image/jpeg", 0.7);
    };
  });
};

const uploadVideoToStorage = async () => {
  if (!uploadedVideoFile) return null;

  const fileName = `videos/${Date.now()}_${uploadedVideoFile.name}`;

  const { data, error } = await window.sb_client.storage
    .from("house-videos")
    .upload(fileName, uploadedVideoFile, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Video upload error:", error);
    notify("Failed to upload video. Please try again.", "error");
    return null;
  }

  const { data: urlData } = window.sb_client.storage
    .from("house-videos")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

window.removeVideo = () => {
  uploadedVideoFile = null;
  uploadedVideoUrl = null;
  uploadedVideoThumbnail = null;
  const videoPreview = document.getElementById("video-preview");
  const videoPreviewContainer = document.getElementById("video-preview-container");
  const videoUploadLabel = document.getElementById("video-upload-label");
  const videoUpload = document.getElementById("video-upload");

  if (videoPreview) videoPreview.src = "";
  if (videoPreviewContainer) videoPreviewContainer.style.display = "none";
  if (videoUploadLabel) videoUploadLabel.style.display = "block";
  if (videoUpload) videoUpload.value = "";
};

const addPreviewItem = (src, file = null, url = "", isExisting = false) => {
  const id = `preview-${Date.now()}-${previewCounter++}`;
  previewItems.push({ id, src, file, url, isExisting });
  renderPreviewImages();
};

const removePreviewItem = (id) => {
  const index = previewItems.findIndex((item) => item.id === id);
  if (index === -1) return;
  
  const removedItem = previewItems[index];
  if (removedItem.isExisting) {
    uploadedPhotos = uploadedPhotos.filter(url => url !== removedItem.url);
  }
  
  previewItems.splice(index, 1);
  renderPreviewImages();
};

const handleFileUpload = (e) => {
  const files = Array.from(e.target.files);
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

  files.forEach((file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return notify(`Only JPEG, PNG, WebP, and GIF images are allowed. "${file.name}" was rejected.`, "error");
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return notify(`Image too large (max 10MB). "${file.name}" was rejected.`, "error");
    }

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

    // Upload video if present
    if (uploadedVideoFile) {
      uploadedVideoUrl = await uploadVideoToStorage();
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
      video_url: uploadedVideoUrl,
      video_thumbnail: uploadedVideoThumbnail,
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
  document
    .getElementById("video-upload")
    ?.addEventListener("change", handleVideoUpload);
  document.getElementById("btn-submit")?.addEventListener("click", submitHouse);
});
