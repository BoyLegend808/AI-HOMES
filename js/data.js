// StudentHome Global Cloud Engine (v3.0 - Production Balanced)
const AUTH_KEY = "studenthome_auth";
const USERS_KEY = "studenthome_users";
const DEFAULT_LOCAL_USERS = [
  {
    name: "Demo Student",
    email: "student@studenthome.com",
    password: "student123",
    phone: "08000000000",
    university: "Ebonyi State University (EBSU)",
    role: "student",
  },
  {
    name: "Demo Admin",
    email: "admin@studenthome.com",
    password: "admin123",
    phone: "08000000000",
    university: "HQ",
    role: "admin",
  },
  {
    name: "Demo Owner",
    email: "owner@studenthome.com",
    password: "owner123",
    phone: "08000000000",
    university: "HQ",
    role: "admin",
  },
];
const SUPABASE_URL = "https://loapruxjeolxyngmcszf.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYXBydXhqZW9seHluZ21jc3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDY4MzQsImV4cCI6MjA5MDMyMjgzNH0.t5H3u-L4M8lODuwWre4NHjKtR_qDboZBBwwzmEXXZh8";

const DEFAULT_LISTINGS = [
  {
    id: 1,
    title: "The Elm Street Shared House",
    location: "Ishieke (EBSU)",
    school: "Ebonyi State University (EBSU)",
    type: "Shared",
    price: 600,
    rooms: 3,
    status: "Active",
    photo:
      "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?fit=crop&w=840&q=80",
    desc: "Shared house with utilities included, 10 min from campus",
    description: "Shared house with utilities included, 10 min from campus",
    amenities: ["WiFi", "Laundry", "Parking"],
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
    desc: "Modern loft with lake view and study area",
    description: "Modern loft with lake view and study area",
    amenities: ["WiFi", "Study Room", "Parking"],
  },
];

const DEFAULT_REVIEWS = [
  {
    id: 1,
    name: "John Doe",
    text: "Excellent proximity to campus and very secure!",
    school: "EBSU",
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    text: "Found a great studio in Akoka within hours. The verification really helps!",
    school: "UNILAG",
  },
  {
    id: 3,
    name: "Michael Okoro",
    text: "No more agency fee drama. I contacted the landlord directly and moved in.",
    school: "UNN",
  },
  {
    id: 4,
    name: "Fatima Bello",
    text: "The photos were exactly like the real room. Very honest platform.",
    school: "ABU",
  },
  {
    id: 5,
    name: "David Chen",
    text: "Safe and affordable. Perfect for international students looking for campus housing.",
    school: "UI",
  },
  {
    id: 6,
    name: "Amaka V.",
    text: "Best decision I made this semester. Close to lectures and quiet for studying.",
    school: "OAU",
  },
];

let sb_client = null;
try {
  if (window.supabase)
    sb_client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  if (sb_client) window.sb_client = sb_client;
} catch (e) {
  console.warn("Cloud Shield: SDK initialization failed.");
}

/* ==========================================
   FORMAL UNIVERSITY SCHEMA (FULL NAME + ABBR)
========================================== */
const DEFAULT_UNIVERSITIES = {
  "Ebonyi State University (EBSU)": [
    "Presco",
    "Palmsite",
    "Town",
    "CAS",
    "Ishieke",
    "Front Gate",
  ],
  "University of Nigeria (UNN)": [
    "Hilltop",
    "Odenigwe",
    "Behind Flat",
    "Zik's Flat",
    "Greenview",
  ],
  "University of Lagos (UNILAG)": ["Akoka", "Yaba", "Bariga", "Onike"],
  "Ahmadu Bello University (ABU)": ["Samaru", "Kongo", "Shika", "Aviation"],
  "University of Ibadan (UI)": ["Agbowo", "Orogun", "Bodija"],
  "Obafemi Awolowo University (OAU)": ["Gate", "Ife Town", "Ede Road"],
};

let CACHED_LISTINGS = [];
let CACHED_REVIEWS = [...DEFAULT_REVIEWS];
let CLOUD_UNIVERSITIES = {};

function normalizeListing(listing = {}) {
  const school = listing.school || "";
  const area = listing.area || "";
  const exactLocation = listing.exactLocation || listing["exactLocation"] || "";
  const location =
    listing.location ||
    [
      exactLocation,
      area && school ? `(${school})` : school ? `(${school})` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    [area, school ? `(${school})` : ""].filter(Boolean).join(" ").trim();

  const photos = Array.isArray(listing.photos)
    ? listing.photos.filter(Boolean)
    : listing.photo
      ? [listing.photo]
      : [];

  const photo =
    listing.photo ||
    photos[0] ||
    "https://via.placeholder.com/400x300?text=No+Image";
  const description = listing.description || listing.desc || "";
  const contact =
    listing.contact && typeof listing.contact === "object"
      ? {
          phone: listing.contact.phone || "",
          whatsapp: listing.contact.whatsapp || "",
        }
      : { phone: "", whatsapp: "" };

  return {
    ...listing,
    school,
    area,
    exactLocation,
    location,
    photos,
    photo,
    description,
    desc: description,
    contact,
    amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
    price: Number(listing.price) || 0,
    rooms: Number(listing.rooms) || 1,
    status: listing.status || "Active",
    type: listing.type || "Self-contain",
  };
}

function syncUniversitiesCache() {
  window.NIGERIA_UNIVERSITIES = getUniversities();
}

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function ensureDefaultUsers() {
  const users = getLocalUsers();
  if (!users || users.length === 0) {
    saveLocalUsers(DEFAULT_LOCAL_USERS);
  }
}

const SYSTEM_ADMINS = [
  {
    name: "Main Admin",
    email: "admin@studenthome.com",
    password: "admin123",
    role: "admin",
    university: "HQ",
  },
  {
    name: "Owner",
    email: "owner@studenthome.com",
    password: "owner123",
    role: "admin",
    university: "HQ",
  },
];

/* ==========================================
   DATA ENGINE
========================================== */
async function fetchAllData() {
  if (fetchAllData.inFlight) return;
  fetchAllData.inFlight = true;
  if (!sb_client) return;
  try {
    const [listingsRes, reviewsRes, unisRes] = await Promise.all([
      sb_client
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false }),
      sb_client
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false }),
      sb_client.from("universities").select("*"),
    ]);

    if (listingsRes.error) {
      console.warn("Cloud Fetch Error (houses):", listingsRes.error);
      if (window.showToast)
        window.showToast("DB Error: Unable to load houses.", "error");
    } else {
      CACHED_LISTINGS = (listingsRes.data || []).map(normalizeListing);
      if (
        listingsRes.data &&
        listingsRes.data.length === 0 &&
        window.showToast
      ) {
        window.showToast("No houses found in the database.", "error");
      }
    }

    if (reviewsRes.error) {
      console.warn("Cloud Fetch Error (reviews):", reviewsRes.error);
    } else if (reviewsRes.data && reviewsRes.data.length > 0) {
      CACHED_REVIEWS = reviewsRes.data;
    }
    if (unisRes.data && unisRes.data.length > 0) {
      window.CLOUD_UNIVERSITIES_DATA = unisRes.data;
      const transformed = {};
      unisRes.data.forEach((u) => {
        transformed[u.name] = u.locations;
      });
      CLOUD_UNIVERSITIES = transformed;
    }
  } catch (e) {
    console.warn("Cloud Fetch Error.");
  } finally {
    fetchAllData.inFlight = false;
  }

  // Re-trigger visual updates after every successful fetch
  requestAnimationFrame(() => {
    syncUniversitiesCache();
    if (window.renderHome) window.renderHome();
    if (window.renderShopGrid) window.renderShopGrid(getListings());
    if (window.renderDashboard) window.renderDashboard();
    if (window.renderDetailsPage) window.renderDetailsPage();
  });
}

function initRealtime() {
  if (!sb_client) return;
  sb_client
    .channel("schema-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "houses" },
      fetchAllData,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reviews" },
      fetchAllData,
    )
    .subscribe();
}

const getListings = () =>
  CACHED_LISTINGS && CACHED_LISTINGS.length
    ? CACHED_LISTINGS.map(normalizeListing)
    : [];
const getReviews = () =>
  CACHED_REVIEWS && CACHED_REVIEWS.length ? CACHED_REVIEWS : DEFAULT_REVIEWS;
const getUniversities = () =>
  Object.keys(CLOUD_UNIVERSITIES).length > 0
    ? CLOUD_UNIVERSITIES
    : DEFAULT_UNIVERSITIES;

function getUniversityLogo(uniName) {
  if (window.CLOUD_UNIVERSITIES_DATA) {
    const uni = window.CLOUD_UNIVERSITIES_DATA.find(
      (u) => u.name.toLowerCase() === uniName.toLowerCase(),
    );
    if (uni && uni.logo_url) return uni.logo_url;
  }
  return "https://via.placeholder.com/150/020617/F97316?text=UNI"; // Fallback beautiful logo
}

window.updateUniversityLogoScale = async (uniId, scale) => {
  if (!sb_client) return { success: false };

  // Try to update logo_scale, but handle cases where column might be missing in cache
  try {
    const { data, error } = await sb_client
      .from("universities")
      .update({ logo_scale: parseFloat(scale) })
      .eq("id", uniId);

    if (!error) {
      if (window.fetchAllData) window.fetchAllData();
      return { success: true };
    }

    // If column missing error, we just keep it in local state for this session
    if (error.code === "PGRST204" || error.message.includes("logo_scale")) {
      // Suppress the loud error log and show a friendly one
      const uni = window.CLOUD_UNIVERSITIES_DATA?.find((u) => u.id === uniId);
      if (uni) uni.logo_scale = scale;
      return { success: true, localOnly: true };
    }

    return { success: false, error };
  } catch (e) {
    return { success: false, error: e };
  }
};

/* ==========================================
   PRODUCTION AUTH
========================================== */
function getCurrentUser() {
  const u = localStorage.getItem(AUTH_KEY);
  // Cached user is for UI hints only; do not use role here for authorization.
  return u ? JSON.parse(u) : null;
}

async function fetchSessionUser() {
  if (!sb_client) return getCurrentUser();
  try {
    const { data, error } = await sb_client.auth.getUser();
    if (error || !data?.user) {
      // If the cloud vault rejected them, destroy the Sticky Note!
      // (Unless it's one of our offline demo accounts)
      const local = getCurrentUser();
      if (
        local &&
        !["admin123", "owner123", "student123"].includes(local.password)
      ) {
        localStorage.removeItem(AUTH_KEY);
        return null;
      }
      return local;
    }

    const { data: profile } = await sb_client
      .from("profiles")
      .select("role, university, full_name")
      .eq("id", data.user.id)
      .single();

    const meta = data.user.user_metadata || {};
    const user = {
      name: profile?.full_name || meta.full_name || "Student",
      email: data.user.email,
      university: profile?.university || meta.university || "Lagos",
      role: profile?.role || "student",
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  } catch (e) {
    return getCurrentUser();
  }
}

async function ensureAdminAccess() {
  const localUser = getCurrentUser();
  const localIsAdmin = localUser?.role === "admin";

  if (!window.sb_client) {
    if (localIsAdmin) return true;
    console.error("Supabase client is not initialized");
    window.location.href = "../home/home.html";
    return false;
  }

  const { data: userData, error: userError } =
    await window.sb_client.auth.getUser();
  if (userError || !userData?.user) {
    if (localIsAdmin) return true;
    console.error("getUser failed:", userError);
    window.location.href = "../home/home.html";
    return false;
  }

  const userId = userData.user.id;
  console.log("ensureAdminAccess userId:", userId);

  const { data: profile, error: profileError } = await window.sb_client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  console.log("profileError:", profileError);
  console.log("profile:", profile);
  console.log("role:", profile?.role);

  if (profileError) {
    window.location.href = "../home/home.html";
    return false;
  }

  const role = profile?.role;
  console.log("ensureAdminAccess role:", JSON.stringify(role));

  if (role) {
    const meta = userData.user.user_metadata || {};
    const cached = getCurrentUser() || {};
    const syncedUser = {
      name: cached.name || meta.full_name || "Student",
      email: userData.user.email || cached.email || "",
      university: cached.university || meta.university || "Lagos",
      role,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(syncedUser));
  }

  if (role !== "admin") {
    window.location.href = "../home/home.html";
    return false;
  }

  return true;
}

async function loginUser(email, password) {
  const checkEmail = email.toLowerCase().trim();
  const admin = SYSTEM_ADMINS.find(
    (u) => u.email.toLowerCase() === checkEmail && u.password === password,
  );
  if (admin) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(admin));
    return { success: true, user: admin };
  }
  const localUser = getLocalUsers().find(
    (u) => u.email.toLowerCase() === checkEmail && u.password === password,
  );
  if (localUser) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(localUser));
    return { success: true, user: localUser };
  }
  if (!sb_client) return { success: false, message: "Cloud offline." };

  const { data, error } = await sb_client.auth.signInWithPassword({
    email: checkEmail,
    password,
  });
  if (error) return { success: false, message: error.message };

  // Check the Database profiles table for the role
  const { data: profile } = await sb_client
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const meta = data.user.user_metadata || {};
  const user = {
    name: meta.full_name || "Student",
    email: data.user.email,
    university: meta.university || "Lagos",
    role: profile?.role || "student",
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return { success: true, user };
}

async function registerUser(data) {
  const email = data.email.toLowerCase().trim();
  const users = getLocalUsers();
  if (users.some((u) => u.email.toLowerCase() === email)) {
    return { success: false, message: "Email already registered." };
  }

  const localUser = {
    name: data.name,
    email,
    password: data.password,
    phone: data.phone || "",
    university: data.university,
    role: "student",
  };
  users.push(localUser);
  saveLocalUsers(users);

  if (!sb_client) return { success: true, message: "" };
  const { error } = await sb_client.auth.signUp({
    email,
    password: data.password,
    options: {
      data: {
        full_name: data.name,
        university: data.university,
        phone: data.phone,
      },
    },
  });
  return { success: !error, message: error ? error.message : "" };
}

function resetSystemData() {
  if (
    confirm(
      "Nuclear Reset: This will clear your local login and all cached data. The app will reload and fetch fresh data from the cloud. Continue?",
    )
  ) {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem("studenthome_listings");
    window.location.href = "../home/home.html";
  }
}

function logoutUser() {
  if (sb_client) sb_client.auth.signOut();
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "../home/home.html";
}

async function resetPasswordForEmail(email) {
  if (!sb_client) return { success: false, message: "Cloud offline." };
  // Send password reset email, redirecting to the local reset page
  const { error } = await sb_client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password.html",
  });
  return {
    success: !error,
    message: error ? error.message : "Password reset link sent to your email!",
  };
}

async function updateUserPassword(newPassword) {
  if (!sb_client) return { success: false, message: "Cloud offline." };
  const { data, error } = await sb_client.auth.updateUser({
    password: newPassword,
  });
  return {
    success: !error,
    message: error ? error.message : "Password updated successfully!",
  };
}

/* ==========================================
   PREMIUM NAVIGATION ENGINE
   ========================================== */
const NavState = {
  get nav() {
    return document.querySelector(".nav-links");
  },
  get toggle() {
    return document.querySelector(".mobile-menu-toggle");
  },
  get overlay() {
    return document.querySelector(".nav-overlay");
  },
};

function closeMobileMenu() {
  const { nav, overlay, toggle } = NavState;
  document.body.classList.remove("menu-open");
  if (nav) nav.classList.remove("menu-active");
  if (overlay) overlay.classList.remove("menu-active");
  if (toggle) {
    const txt = toggle.querySelector(".mobile-toggle-text");
    if (txt) txt.textContent = "MENU";
  }
  document.body.style.overflow = "";
}

window.closeMobileMenu = closeMobileMenu;

function toggleMobileMenu(e) {
  if (e) e.stopPropagation();
  const { nav, overlay, toggle } = NavState;
  console.log("Toggle Mobile Menu Clicked", { nav, overlay, toggle });
  if (!nav || !overlay) {
    console.warn("Nav or Overlay not found", { nav, overlay });
    return;
  }

  const isOpen = nav.classList.contains("menu-active");
  const txt = toggle ? toggle.querySelector(".mobile-toggle-text") : null;

  if (!isOpen) {
    document.body.classList.add("menu-open");
    nav.classList.add("menu-active");
    overlay.classList.add("menu-active");
    if (txt) txt.textContent = "CLOSE";
    document.body.style.overflow = "hidden";
  } else {
    closeMobileMenu();
  }
}

function handleGlobalClick(e) {
  const { nav, toggle } = NavState;
  if (!nav || !nav.classList.contains("menu-active")) return;
  if (nav.contains(e.target) || (toggle && toggle.contains(e.target))) return;
  closeMobileMenu();
}

function formatPrice(price, withPeriod = false) {
  const amount = Number(price) || 0;
  const formatted = `₦${amount.toLocaleString()}`;
  return withPeriod ? `${formatted}/mo` : formatted;
}

function showToast(message, type = "info") {
  const text = String(message || "").trim();
  if (!text) return;
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = text;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast--show"));

  const remove = () => {
    toast.classList.remove("toast--show");
    setTimeout(() => toast.remove(), 200);
  };

  setTimeout(remove, 3200);
  toast.addEventListener("click", remove);
}

function getEmptyStateHTML(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-illustration" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 10.5 12 3l9 7.5"></path>
          <path d="M5 9.5V21h14V9.5"></path>
          <path d="M9 21v-6h6v6"></path>
        </svg>
      </div>
      <h3 class="empty-heading">${title}</h3>
      <p class="empty-subtext">${message}</p>
      <button class="btn-clear" type="button" onclick="window.location.href='../shop/shop.html'">Browse all houses</button>
    </div>
  `;
}

let navRenderToken = 0;

async function renderGlobalNav() {
  const renderToken = ++navRenderToken;

  const navLinks = document.querySelector(".nav-links");
  const head = document.querySelector(".top-nav");
  if (!navLinks || !head) return;

  // Immediate binding for the toggle if it exists
  let mobileToggle = head.querySelector(".mobile-menu-toggle");
  if (mobileToggle) {
    mobileToggle.onclick = toggleMobileMenu;
  }

  const user = await fetchSessionUser(); // ALWAYS check the vault now!
  const currentPage = window.location.pathname.split("/").pop() || "home.html";

  if (!mobileToggle) {
    mobileToggle = document.createElement("button");
    mobileToggle.className = "mobile-menu-toggle";
    mobileToggle.setAttribute("aria-label", "Toggle menu");
    mobileToggle.innerHTML = `<span class="mobile-toggle-text">MENU</span><div class="hamburger-box"><div class="hamburger-inner"></div></div>`;
    head.appendChild(mobileToggle);
    mobileToggle.onclick = toggleMobileMenu;
  }

  let overlay = document.querySelector(".nav-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    document.body.appendChild(overlay);
  }
  overlay.onclick = closeMobileMenu;

  // Identity Cluster
  let idBox = document.getElementById("nav-id-box");
  if (!idBox) {
    idBox = document.createElement("div");
    idBox.id = "nav-id-box";
    idBox.className = "nav-identity-cluster";
    head.appendChild(idBox);
  }

  if (user) {
    const uniName = String(user.university || "").trim();
    const logoUrl = getUniversityLogo(uniName);
    idBox.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;" onclick="window.location.href='../profile/profile.html'">
         <img src="${logoUrl}" alt="${uniName} Logo" style="width: 38px; height: 38px; border-radius: 50%; object-fit: contain; background: white; margin-bottom: 0.2rem; border: 2px solid var(--accent);">
         <div style="font-weight:700; font-size:0.8rem; color:white; line-height:1.2;">${user.name}</div>
         <div style="font-size:0.6rem; color:var(--accent); text-transform:uppercase;">${uniName}</div>
      </div>`;
    idBox.style.opacity = "1";
    idBox.style.pointerEvents = "auto";
  } else {
    idBox.style.opacity = "0";
    idBox.style.pointerEvents = "none";
  }

  navLinks.innerHTML = `
    <ul class="nav-list">
      <li class="nav-mobile-label" style="justify-content: space-between; align-items: center; padding-right: 1.5rem;">
        <span>Navigation</span>
        <button onclick="window.closeMobileMenu()" style="background:none; border:none; color:white; font-size:2rem; cursor:pointer; line-height:1; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">×</button>
      </li>
      <li><a href="../home/home.html" class="${currentPage === "home.html" ? "active" : ""}">Home</a></li>
      <li><a href="../shop/shop.html" class="${currentPage === "shop.html" ? "active" : ""}">Browse Houses</a></li>
      <li><a href="../about/about.html" class="${currentPage === "about.html" ? "active" : ""}">About Us</a></li>
      <li><a href="../contact/contact.html" class="${currentPage === "contact.html" ? "active" : ""}">Contact</a></li>
      ${user ? `<li><a href="../profile/profile.html" class="${currentPage === "profile.html" ? "active" : ""}">My Profile</a></li>` : '<li><a href="../auth/auth.html">Login</a></li>'}
      ${user ? '<li><a href="#" data-logout-btn class="logout-link">Logout</a></li>' : '<li><a href="../auth/auth.html?mode=register" class="hero-btn nav-join-btn">Join Now</a></li>'}
    </ul>
  `;

  const isAdmin = await isAdminUser();
  if (renderToken !== navRenderToken) return;
  if (isAdmin) {
    const list = navLinks.querySelector(".nav-list");
    if (list) {
      const li = document.createElement("li");
      li.innerHTML = `<a href="../admin/admin.html" class="${currentPage.includes("admin") ? "active" : ""}">Dashboard</a>`;
      const anchor = list.querySelector(".logout-link");
      list.insertBefore(
        li,
        anchor ? anchor.parentElement : list.lastElementChild,
      );
    }
  }

  navLinks.onclick = (e) => {
    const link = e.target.closest("a");
    if (link) {
      closeMobileMenu();
      if (link.hasAttribute("data-logout-btn")) {
        e.preventDefault();
        logoutUser();
        return;
      }
      const href = link.getAttribute("href");
      if (href && href !== "#") {
        e.preventDefault();
        window.location.href = href;
      }
    }
  };
}

async function isAdminUser() {
  if (!window.sb_client) return false;
  const { data: userData, error: userError } =
    await window.sb_client.auth.getUser();
  if (userError || !userData?.user) return false;
  const { data: profile, error: profileError } = await window.sb_client
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profileError || !profile?.role) return false;
  return profile.role === "admin";
}

function populateUniversitySelects() {
  syncUniversitiesCache();
  const universities = Object.keys(getUniversities() || {});
  const selects = [
    document.getElementById("reg-uni"),
    document.getElementById("add-school"),
  ].filter(Boolean);

  selects.forEach((select) => {
    const current = select.value;
    select.innerHTML =
      `<option value="">Select University</option>` +
      universities.map((u) => `<option value="${u}">${u}</option>`).join("");
    if (current) select.value = current;
  });

  const schoolSelect = document.getElementById("add-school");
  const areaSelect = document.getElementById("add-area");
  if (schoolSelect && areaSelect) {
    const updateAreas = () => {
      const areas = getUniversities()[schoolSelect.value] || [];
      areaSelect.innerHTML = areas
        .map((a) => `<option value="${a}">${a}</option>`)
        .join("");
    };
    schoolSelect.addEventListener("change", updateAreas);
    updateAreas();
  }
}

/* ==========================================
   LIFECYCLE
========================================== */
document.addEventListener("DOMContentLoaded", async () => {
  ensureDefaultUsers();
  renderGlobalNav();
  syncUniversitiesCache();
  populateUniversitySelects();
  initRealtime();
  const fetchPromise = fetchAllData();

  // URL Shortcut Reset: another way instead of F12
  if (new URLSearchParams(window.location.search).has("reset")) {
    resetSystemData();
  }

  document.addEventListener("click", handleGlobalClick);

  // GLASS NAV EFFECT
  window.addEventListener("scroll", () => {
    const h = document.querySelector(".top-nav");
    if (!h) return;
    if (window.scrollY > 40) {
      h.style.background = "rgba(10, 12, 16, 0.94)";
      h.style.backdropFilter = "blur(18px)";
      h.style.webkitBackdropFilter = "blur(18px)";
      h.style.padding = "0.7rem 2.5rem";
      h.style.borderBottom = "1px solid rgba(217, 108, 66, 0.15)";
    } else {
      h.style.background = "rgba(10, 12, 16, 0.85)";
      h.style.backdropFilter = "blur(12px)";
      h.style.webkitBackdropFilter = "blur(12px)";
      h.style.padding = "1rem 2.5rem";
      h.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
    }
  });

  if (fetchPromise && typeof fetchPromise.then === "function") {
    fetchPromise.finally(() => {
      populateUniversitySelects();
      if (window.renderHome) window.renderHome();
    });
  }
});

/* ==========================================
   EXPORTS
========================================= */
window.getListings = getListings;
window.getReviews = getReviews;
window.getListingById = (id) =>
  CACHED_LISTINGS.find((h) => String(h.id) === String(id));
window.DEFAULT_LISTINGS = DEFAULT_LISTINGS;
window.getCurrentUser = getCurrentUser;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.resetPasswordForEmail = resetPasswordForEmail;
window.updateUserPassword = updateUserPassword;
window.getUniversities = getUniversities;
window.NIGERIA_UNIVERSITIES = getUniversities();
window.resetSystemData = resetSystemData;
window.HOUSE_TYPES = [
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "Self-contain",
  "Studio",
];

window.uploadPhotoToStorage = async (file) => {
  if (!sb_client) return null;
  // Create a unique file name
  const fileExt = file.name.split(".").pop();
  const fileName = `house_${Math.random().toString(36).slice(2)}_${Date.now()}.${fileExt}`;
  const filePath = `public/${fileName}`;

  const { data, error } = await sb_client.storage
    .from("house-photos")
    .upload(filePath, file);

  if (error) {
    console.warn("Storage Error:", error);
    return null;
  }

  const { data: publicUrlData } = sb_client.storage
    .from("house-photos")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};

window.addListing = async (h) => {
  if (!sb_client)
    return { success: false, error: { message: "Cloud offline" } };
  const payload = normalizeListing(h);
  const { error } = await sb_client.from("houses").insert([payload]);
  if (!error) await fetchAllData();
  return { success: !error, error };
};
window.deleteListing = async (id) => {
  if (!sb_client) return { success: false };
  const { error } = await sb_client.from("houses").delete().eq("id", id);
  if (!error) await fetchAllData();
  return { success: !error };
};
window.addReview = async (r) => {
  if (!sb_client)
    return { success: false, error: { message: "Cloud offline" } };
  const { error } = await sb_client.from("reviews").insert([r]);
  if (!error) await fetchAllData();
  return { success: !error, error };
};
window.addUniversity = async (n) => {
  if (!sb_client) return { success: false };
  const { error } = await sb_client
    .from("universities")
    .insert([{ name: n, locations: [] }]);
  if (!error) await fetchAllData();
  return { success: !error };
};
window.addAreaToUniversity = async (n, a) => {
  if (!sb_client) return { success: false };
  const { data: u } = await sb_client
    .from("universities")
    .select("id, locations")
    .eq("name", n)
    .single();
  if (!u) return { success: false };
  const locs = [...u.locations, a];
  const { error } = await sb_client
    .from("universities")
    .update({ locations: locs })
    .eq("id", u.id);
  if (!error) await fetchAllData();
  return { success: !error };
};

window.toggleFavorite = async (houseId) => {
  const user = await fetchSessionUser();
  if (!user) {
    alert("Please login or create an account to save favorites!");
    window.location.href = "../auth/auth.html";
    return { success: false, error: "login_required" };
  }

  if (!sb_client) return { success: false };
  // Simplified logic: Check if exists, then insert or delete
  const { data } = await sb_client
    .from("favorites")
    .select("id")
    .eq("house_id", houseId)
    .single();
  if (data) return sb_client.from("favorites").delete().eq("id", data.id);

  const { data: userData } = await sb_client.auth.getUser();
  return sb_client.from("favorites").insert([
    {
      house_id: houseId,
      user_id: userData.user.id,
    },
  ]);
};

window.createLead = async (lead) => {
  if (!sb_client) return { success: false };
  return sb_client.from("leads").insert([lead]);
};

window.incrementViews = async (id) => {
  if (!sb_client) return;
  return sb_client.rpc("increment_house_views", { house_id_input: id });
};

window.fetchSessionUser = fetchSessionUser;
window.fetchAllData = fetchAllData;
window.formatPrice = formatPrice;
window.getEmptyStateHTML = getEmptyStateHTML;
window.showToast = showToast;
window.DEFAULT_TEST_LOGINS = {
  student: { email: "student@studenthome.com", password: "student123" },
  admin: { email: "admin@studenthome.com", password: "admin123" },
  owner: { email: "owner@studenthome.com", password: "owner123" },
};

window.initReveal = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        }
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
};
window.updateListing = async (h) => {
  if (!sb_client)
    return { success: false, error: { message: "Cloud offline" } };
  const payload = normalizeListing(h);
  const { id, ...updates } = payload;
  const { data, error } = await sb_client
    .from("houses")
    .update(updates)
    .eq("id", id)
    .select("id");
  const success = !error && Array.isArray(data) && data.length > 0;
  if (success) await fetchAllData();
  if (!success && !error) {
    return {
      success: false,
      error: {
        message:
          "No rows updated. Ensure you are logged in as an admin and your profile role is admin.",
      },
    };
  }
  return { success, error };
};
