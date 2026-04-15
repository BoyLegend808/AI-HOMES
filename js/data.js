// runing it from ther https://ai-homes.vercel.app/home/home.html
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
let SUPABASE_CONFIG = null;

const DEFAULT_LISTINGS = [];

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
  "University of Lagos (UNILAG)": ["Akoka", "Yaba", "Bariga", "Onike"],
  "Ahmadu Bello University (ABU)": ["Samaru", "Kongo", "Shika", "Aviation"],
};

let CACHED_LISTINGS = [];
let CACHED_REVIEWS = [...DEFAULT_REVIEWS];
let CLOUD_UNIVERSITIES = {};
let CACHED_FAVORITES = [];
window.hasFetchedHouses = false;

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
  
  // LAZY INIT CONFIG + CLIENT
  if (!SUPABASE_CONFIG) {
    try {
      console.log('Fetching configuration from /api/config...');
      const res = await Promise.race([
        fetch('/api/config'),
        new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')), 5000))
      ]);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      
      const config = await res.json();
      if (config && config.url && config.key) {
        SUPABASE_CONFIG = config;
        // Only re-initialize if different or not already initialized
        if (!sb_client || sb_client.supabaseUrl !== config.url) {
          sb_client = window.supabase?.createClient(config.url, config.key);
          if (sb_client) window.sb_client = sb_client;
          console.log('Supabase client initialized from server config.');
        }
      } else {
        throw new Error('Server config returned empty URL or Key');
      }
    } catch(e) {
      console.warn('Config fetch failed, using internal defaults:', e.message);
      // Fallback: If we don't have an sb_client yet, use the hardcoded defaults
      if (!sb_client && SUPABASE_URL && SUPABASE_KEY) {
        console.log('Initializing Supabase with hardcoded fallback keys...');
        try {
          sb_client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
          if (sb_client) window.sb_client = sb_client;
        } catch (initErr) {
          console.error('Hardcoded fallback init failed:', initErr);
        }
      }
    }
  }
  
if (!sb_client) {
    console.warn('Using fallback data - no Supabase');
    useFallbackData();
    fetchAllData.inFlight = false;
    window.hasFetchedHouses = true;
    refreshAllPages();
    return;
  }
  
  console.log('Cloud fetch START');
  try {
    const user = getCurrentUser();
    const calls = [
      sb_client
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false }),
      sb_client
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false }),
      sb_client.from("universities").select("*"),
    ];

    if (user) {
      try {
        const { data: userData } = await sb_client.auth.getUser();
        if (userData?.user) {
          calls.push(
            sb_client
              .from("favorites")
              .select("house_id")
              .eq("user_id", userData.user.id),
          );
        }
      } catch (authErr) {
        console.warn(
          "Auth check timed out or failed, proceeding with public fetch.",
          authErr,
        );
      }
    }

    // TIMEOUT-RACED PARALLEL CALLS (5s max each)
    const TIMEOUT = 5000;
    const safeCall = (p) => Promise.race([
      p, 
      new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')), TIMEOUT))
    ]);
    
    const results = await Promise.allSettled([
      safeCall(sb_client.from("houses").select("*").order("created_at", { ascending: false })),
      safeCall(sb_client.from("reviews").select("*").order("created_at", { ascending: false })),
      safeCall(sb_client.from("universities").select("*")),
      ...(window.CACHED_FAVORITES?.length ? [safeCall(sb_client.from("favorites").select("house_id").eq("user_id", getCurrentUser()?.id))] : [])
    ]);

    // ROBUST PROCESSING WITH FALLBACKS
    const [listingsRes, reviewsRes, unisRes, favsRes] = results;
    
    // HOUSES: Fallback to DEFAULT if empty/failed
    if (listingsRes.status === "fulfilled" && listingsRes.value.data?.length > 0) {
      CACHED_LISTINGS = listingsRes.value.data.map(normalizeListing);
    } else {
      console.warn('Houses fetch failed → DEFAULT_LISTINGS');
      CACHED_LISTINGS = DEFAULT_LISTINGS.map(normalizeListing);
    }
    window.hasFetchedHouses = true;

    // REVIEWS: Keep existing if new fetch fails
    if (reviewsRes.status === "fulfilled" && reviewsRes.value.data?.length > 0) {
      CACHED_REVIEWS = reviewsRes.value.data;
    }

    // UNIS: Fallback to DEFAULT_UNIVERSITIES
    if (unisRes.status === "fulfilled" && unisRes.value.data?.length > 0) {
      window.CLOUD_UNIVERSITIES_DATA = unisRes.value.data;
      const transformed = {};
      unisRes.value.data.forEach((u) => transformed[u.name] = u.locations);
      CLOUD_UNIVERSITIES = transformed;
    }

    // FAVORITES: Merge safely
    if (favsRes?.status === "fulfilled" && favsRes.value.data) {
      const cloudIds = favsRes.value.data.map(f => String(f.house_id));
      CACHED_FAVORITES = [...new Set([...CACHED_FAVORITES.map(String), ...cloudIds])];
      localStorage.setItem(LOCAL_FAVS_KEY, JSON.stringify(CACHED_FAVORITES));
    }
  } catch (e) {
    console.error('Cloud batch failed:', e);
    useFallbackData();
} finally {
    window.hasFetchedHouses = true;
    fetchAllData.inFlight = false;
    refreshAllPages();
  }
}

function useFallbackData() {
  CACHED_LISTINGS = DEFAULT_LISTINGS.map(normalizeListing);
  CACHED_REVIEWS = DEFAULT_REVIEWS;
  CLOUD_UNIVERSITIES = DEFAULT_UNIVERSITIES;
  syncUniversitiesCache();
}

function refreshAllPages() {
  requestAnimationFrame(() => {
    syncUniversitiesCache();
    ['populateSchoolOptions','renderHome','renderShopGrid','renderDashboard','renderDetailsPage'].forEach(fn => {
      if (window[fn]) window[fn]();
    });
  });
}


// FAVORITES PERSISTENCE SYSTEM
const LOCAL_FAVS_KEY = "studenthome_wishlist";

window.toggleFavorite = async (houseId) => {
  // 1. Instantly Calculate New State (Zero Latency)
  const isCurrentlyFav = CACHED_FAVORITES.some(
    (id) => String(id) === String(houseId),
  );
  const newStatus = !isCurrentlyFav;

  // 2. Optimistic UI Update & Cache Mutation
  if (newStatus) {
    if (!isCurrentlyFav) CACHED_FAVORITES.push(String(houseId));
  } else {
    CACHED_FAVORITES = CACHED_FAVORITES.filter(
      (id) => String(id) !== String(houseId),
    );
  }

  // Update all matching icons on the current page instantly
  document
    .querySelectorAll(`.bookmarkBtn[data-house-id="${houseId}"]`)
    .forEach((btn) => {
      btn.classList.toggle("active", newStatus);
      const ariaLabel = newStatus ? "Remove from variants" : "Save property";
      btn.setAttribute("aria-label", ariaLabel);
    });

  // Persist to LocalStorage (Immediate backup)
  localStorage.setItem(LOCAL_FAVS_KEY, JSON.stringify(CACHED_FAVORITES));

  // 3. BACKGROUND SYNC: Verify user and sync to Supabase without blocking the UI
  try {
    const user = await fetchSessionUser();
    if (user && sb_client) {
      const { data: userData } = await sb_client.auth.getUser();
      if (userData?.user) {
        if (newStatus) {
          await sb_client
            .from("favorites")
            .insert([{ house_id: houseId, user_id: userData.user.id }]);
        } else {
          await sb_client
            .from("favorites")
            .delete()
            .eq("house_id", houseId)
            .eq("user_id", userData.user.id);
        }
      }
    }
  } catch (e) {
    console.warn("Silent background sync failed:", e);
  }

  // 4. Toast Notification
  if (window.showToast) {
    window.showToast(
      newStatus ? "Added to favorites" : "Removed from favorites",
      "success",
    );
  }

  return { success: true };
};

// Initialize favorites on load
async function initFavorites() {
  // Load local storage first
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_FAVS_KEY) || "[]");
    CACHED_FAVORITES = [
      ...new Set([...CACHED_FAVORITES.map(String), ...local.map(String)]),
    ];
  } catch (e) {}

  // Load cloud favorites if logged in
  const user = await fetchSessionUser();
  if (user && sb_client) {
    const {
      data: { user: authUser },
    } = await sb_client.auth.getUser();
    if (authUser) {
      const { data: favs } = await sb_client
        .from("favorites")
        .select("house_id")
        .eq("user_id", authUser.id);
      if (favs) {
        const cloudIds = favs.map((f) => String(f.house_id));
        // Merge cloud into local
        CACHED_FAVORITES = [
          ...new Set([...CACHED_FAVORITES.map(String), ...cloudIds]),
        ];
        localStorage.setItem(LOCAL_FAVS_KEY, JSON.stringify(CACHED_FAVORITES));
      }
    }
  }
}

window.isFavorited = (houseId) =>
  CACHED_FAVORITES.some((id) => String(id) === String(houseId));

window.removeFromFavorites = async (houseId) => {
  await window.toggleFavorite(houseId);
  if (window.renderSavedProperties) window.renderSavedProperties();
};

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

const getListings = () => {
  if (CACHED_LISTINGS && CACHED_LISTINGS.length) {
    return CACHED_LISTINGS.map(normalizeListing);
  }
  if (!window.hasFetchedHouses) {
    return DEFAULT_LISTINGS.map(normalizeListing);
  }
  return [];
};
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
  return "https://via.placeholder.com/150/020617/F97316?text=UNI";
}

window.updateUniversityLogoScale = async (uniId, scale) => {
  if (!sb_client) return { success: false };
  try {
    const { data, error } = await sb_client
      .from("universities")
      .update({ logo_scale: parseFloat(scale) })
      .eq("id", uniId);

    if (!error) {
      if (window.fetchAllData) window.fetchAllData();
      return { success: true };
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
  return u ? JSON.parse(u) : null;
}

async function fetchSessionUser() {
  if (!sb_client) return getCurrentUser();

  // High-Performance Timeout Race
  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("Timeout")), 3500),
  );

  try {
    const { data, error } = await Promise.race([
      sb_client.auth.getUser(),
      timeout,
    ]);

    if (error || !data?.user) {
      return getCurrentUser();
    }

    const { data: profile } = await sb_client
      .from("profiles")
      .select("role, university, full_name")
      .eq("id", data.user.id)
      .single();

    const meta = data.user.user_metadata || {};
    return {
      id: data.user.id,
      name: profile?.full_name || meta.full_name || "Student",
      email: data.user.email,
      university: profile?.university || meta.university || "Lagos",
      role: profile?.role || meta.role || "student",
      avatar_url: data.user.user_metadata?.avatar_url || "",
    };
  } catch (err) {
    console.warn("Session Recovery: Using local cache due to latency/error.");
    return getCurrentUser();
  }
}

async function ensureAdminAccess() {
  if (!window.sb_client) {
    const localUser = getCurrentUser();
    if (localUser?.role === "admin") return true;
    window.location.href = "../home/home.html";
    return false;
  }
  const { data: userData, error: userError } =
    await window.sb_client.auth.getUser();
  if (userError || !userData?.user) {
    window.location.href = "../home/home.html";
    return false;
  }
  const { data: profile } = await window.sb_client
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") {
    window.location.href = "../home/home.html";
    return false;
  }
  return true;
}

async function loginUser(email, password) {
  const checkEmail = email.toLowerCase().trim();
  if (sb_client) {
    const { data, error } = await sb_client.auth.signInWithPassword({
      email: checkEmail,
      password,
    });
    if (!error && data?.user) {
      const { data: profile } = await sb_client
        .from("profiles")
        .select("role, university, phone, full_name")
        .eq("id", data.user.id)
        .single();
      const meta = data.user.user_metadata || {};
      const user = {
        name: profile?.full_name || meta.full_name || "Student",
        email: data.user.email,
        phone: profile?.phone || meta.phone || "",
        university: profile?.university || meta.university || "Lagos",
        role: profile?.role || "student",
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      return { success: true, user };
    }
  }
  const admin = SYSTEM_ADMINS.find(
    (u) => u.email.toLowerCase() === checkEmail && u.password === password,
  );
  if (admin) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(admin));
    return { success: true, user: admin };
  }
  return { success: false, message: "Invalid credentials or cloud offline." };
}

async function registerUser(data) {
  const email = data.email.toLowerCase().trim();
  if (!sb_client) return { success: false, message: "Cloud offline" };
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
  if (confirm("Nuclear Reset?")) {
    localStorage.clear();
    window.location.href = "../home/home.html";
  }
}

function logoutUser() {
  if (sb_client) sb_client.auth.signOut();
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "../home/home.html";
}

// RE-ENABLED Forgot Password with DEBOUNCE (1 call/min)
const resetDebounce = { lastCall: 0, pending: null };
window.resetPasswordForEmail = async (email) => {
  const now = Date.now();
  if (now - resetDebounce.lastCall < 60000) {
    return { success: false, message: "Please wait 1 minute between requests" };
  }
  
  if (resetDebounce.pending) clearTimeout(resetDebounce.pending);
  
  return new Promise((resolve) => {
    resetDebounce.pending = setTimeout(async () => {
      try {
        const response = await Promise.race([
          fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.toLowerCase().trim() }),
          }),
          new Promise((_,r) => setTimeout(() => r(new Error('timeout')), 10000))
        ]);
        const data = await response.json();
        resetDebounce.lastCall = Date.now();
        resolve({ success: response.ok, message: data.message || data.error });
      } catch(e) {
        resolve({ success: false, message: "Network error" });
      }
    }, 500);
  });
};


async function updateUserPassword(newPassword) {
  if (!sb_client) return { success: false, message: "Cloud offline." };
  const { error } = await sb_client.auth.updateUser({ password: newPassword });
  return { success: !error, message: error ? error.message : "Updated!" };
}

/* ==========================================
   NAVIGATION
========================================== */
function closeMobileMenu() {
  document.body.classList.remove("menu-open", "no-scroll");
  const nav = document.querySelector(".nav-links");
  const overlay = document.querySelector(".nav-overlay");
  if (nav) nav.classList.remove("menu-active");
  if (overlay) overlay.classList.remove("menu-active");
}

function toggleMobileMenu() {
  const nav = document.querySelector(".nav-links");
  const overlay = document.querySelector(".nav-overlay");
  if (!nav) return;
  const isOpen = nav.classList.contains("menu-active");
  if (!isOpen) {
    document.body.classList.add("menu-open", "no-scroll");
    nav.classList.add("menu-active");
    if (overlay) overlay.classList.add("menu-active");
  } else {
    closeMobileMenu();
  }
}

function handleGlobalClick(e) {
  const nav = document.querySelector(".nav-links");
  const toggle = document.querySelector(".mobile-menu-toggle");
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
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("toast--show"), 10);
  setTimeout(() => {
    toast.classList.remove("toast--show");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function getEmptyStateHTML(title, message) {
  return `<div class="empty-state"><h3>${title}</h3><p>${message}</p></div>`;
}

async function renderGlobalNav() {
  const head = document.querySelector(".top-nav");
  if (!head) return;
  const currentPage = window.location.pathname.split("/").pop() || "home.html";

  // Identifiers for DOM elements
  const toggle = document.querySelector(".mobile-menu-toggle");
  const overlay = document.querySelector(".nav-overlay");
  const navLinks = document.querySelector(".nav-list");
  const rightZone = head.querySelector(".nav-right");

  // 1. FAST BINDING (Zero Delay)
  if (toggle) {
    toggle.onclick = (e) => {
      e.stopPropagation();
      if (window.toggleMobileMenu) window.toggleMobileMenu();
    };
    toggle.classList.add("is-ready");
  }

  if (overlay) {
    overlay.onclick = () => {
      if (window.closeMobileMenu) window.closeMobileMenu();
    };
  }

  // 2. SYNCHRONOUS PRE-RENDER (No Wait)
  let baseLinks = `
    <li><a href="../home/home.html" class="${currentPage === "home.html" ? "active" : ""}">Home</a></li>
    <li><a href="../shop/shop.html" class="${currentPage === "shop.html" ? "active" : ""}">Browse Houses</a></li>
    <li><a href="../about/about.html" class="${currentPage === "about.html" ? "active" : ""}">About</a></li>
    <li><a href="../contact/contact.html" class="${currentPage === "contact.html" ? "active" : ""}">Contact</a></li>
  `;

  if (navLinks) {
    // Show Unified Big Skeleton initially
    navLinks.classList.add("is-loading-total");
    navLinks.innerHTML = `<div class="full-nav-skeleton"></div>`;

    const navPanel = document.querySelector(".nav-links");
    if (navPanel && !navPanel.querySelector(".nav-mobile-header")) {
      const mobileHeader = document.createElement("div");
      mobileHeader.className = "nav-mobile-header";
      mobileHeader.innerHTML = `
        <span>Menu</span>
        <button class="mobile-close-btn" onclick="closeMobileMenu()">
          <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
        </button>
      `;
      navPanel.insertBefore(mobileHeader, navPanel.firstChild);
    }
  }

  // 3. SYNCHRONOUS SKELETON (Identity area)
  let idBox = document.getElementById("nav-id-box");
  if (!idBox && rightZone) {
    idBox = document.createElement("div");
    idBox.id = "nav-id-box";
    idBox.className = "nav-identity-cluster skeleton-state";
    idBox.innerHTML = `
      <div class="nav-identity-skeleton">
        <div class="nav-skel-avatar"></div>
        <div class="nav-skel-lines" style="width: 80px;">
          <div class="nav-skel-line is-name"></div>
          <div class="nav-skel-line is-uni"></div>
        </div>
      </div>`;
    rightZone.insertBefore(idBox, toggle);
  }

  // 4. OPTIMIZED ASYNC AUTH RESOLUTION (Parallel & Single-Call)
  try {
    const user = await fetchSessionUser();
    // Cache the role immediately to avoid a second DB hit
    const isAdmin = user?.role === "admin";

    // Final identity update
    if (user && idBox) {
      idBox.classList.remove("skeleton-state");
      const uniName = String(user.university || "").trim();
      const logoUrl =
        user.avatar_url ||
        (window.getUniversityLogo ? getUniversityLogo(uniName) : "");
      idBox.innerHTML = `
        <div class="nav-id-inner" onclick="window.location.href='../profile/profile.html'">
           <img src="${logoUrl}" alt="${uniName} Logo" style="border-radius: 50%; object-fit: cover;">
           <div class="nav-id-text">
             <div class="nav-id-name">${user.name}</div>
             <div class="nav-id-uni">${uniName}</div>
           </div>
        </div>`;
      idBox.style.opacity = "1";
      idBox.style.pointerEvents = "auto";
    } else if (idBox) {
      idBox.remove();
    }

    // Final links update (Remove skeleton, show real links)
    if (navLinks) {
      let authLinks = "";
      if (user) {
        if (isAdmin) {
          authLinks += `<li><a href="../admin/admin.html" class="${currentPage.includes("admin") ? "active" : ""}">Dashboard</a></li>`;
        }
        authLinks += `<li><a href="../profile/profile.html" class="${currentPage === "profile.html" ? "active" : ""}">Profile</a></li>`;
        authLinks += `<li><a href="#" onclick="logoutUser(); return false;">Logout</a></li>`;
      } else {
        authLinks += `<li><a href="../auth/auth.html">Login</a></li>`;
      }
      navLinks.classList.remove("is-loading-total");
      navLinks.innerHTML = baseLinks + authLinks;
    }
  } catch (err) {
    console.error("Navigation load failed:", err);
    if (navLinks) {
      navLinks.classList.remove("is-loading-total");
      navLinks.innerHTML =
        baseLinks + `<li><a href="../auth/auth.html">Login</a></li>`;
    }
    if (idBox) idBox.remove();
  }
}

async function isAdminUser() {
  const user = await fetchSessionUser();
  return user?.role === "admin";
}

function populateUniversitySelects() {
  const universities = Object.keys(getUniversities());
  const selects = [
    document.getElementById("reg-uni"),
    document.getElementById("add-school"),
  ].filter(Boolean);
  selects.forEach((s) => {
    const val = s.value;
    s.innerHTML =
      '<option value="">Select University</option>' +
      universities.map((u) => `<option value="${u}">${u}</option>`).join("");
    if (val) s.value = val;
  });
}

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fa = document.createElement("link");
    fa.rel = "stylesheet";
    fa.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
    document.head.appendChild(fa);
  }

  renderGlobalNav();
  populateUniversitySelects();
  initFavorites();
  initRealtime();
  fetchAllData();
  document.addEventListener("click", handleGlobalClick);
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
  const fileName = `house_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const { error } = await sb_client.storage
    .from("house-photos")
    .upload(`public/${fileName}`, file);
  if (error) return null;
  const { data } = sb_client.storage
    .from("house-photos")
    .getPublicUrl(`public/${fileName}`);
  return data.publicUrl;
};
window.addListing = async (h) => {
  if (!sb_client) return { success: false };
  const { error } = await sb_client
    .from("houses")
    .insert([normalizeListing(h)]);
  if (!error) fetchAllData();
  return { success: !error };
};
window.deleteListing = async (id) => {
  if (!sb_client) return { success: false };
  const { error } = await sb_client.from("houses").delete().eq("id", id);
  if (!error) fetchAllData();
  return { success: !error };
};

window.createInquiry = async (inquiry) => {
  if (!sb_client) return { success: false };
  return sb_client.from("inquiries").insert([inquiry]);
};
window.incrementViews = async (id) => {
  if (sb_client) sb_client.rpc("increment_house_views", { house_id_input: id });
};
window.fetchSessionUser = fetchSessionUser;
window.fetchAllData = fetchAllData;
window.formatPrice = formatPrice;
window.getEmptyStateHTML = getEmptyStateHTML;
window.showToast = showToast;
window.updateListing = async (h) => {
  if (!sb_client) return { success: false };
  const payload = normalizeListing(h);
  const { id, ...updates } = payload;
  const { error } = await sb_client.from("houses").update(updates).eq("id", id);
  if (!error) fetchAllData();
  return { success: !error };
};
window.addReview = async (r) => {
  if (!sb_client) return { success: false };
  const { error } = await sb_client.from("reviews").insert([r]);
  if (!error) fetchAllData();
  return { success: !error };
};
window.initReveal = () => {
  const obs = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("active");
      });
    },
    { threshold: 0.1 },
  );
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
};
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
