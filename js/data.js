// runing it from ther https://ai-homes.vercel.app/home/home.html
// AI HOMES Global Cloud Engine (v3.0 - Production Balanced)
// Auth is now in-memory only (no localStorage)
let _currentUser = null;
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

// No localStorage cache — all data is fetched fresh from Supabase each session.

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
    video_url: listing.video_url || null,
    video_thumbnail: listing.video_thumbnail || null,
  };
}

function syncUniversitiesCache() {
  window.NIGERIA_UNIVERSITIES = getUniversities();
}

// Local user helpers removed — auth is Supabase-only.

const SYSTEM_ADMINS = [];
// Admin accounts are now managed exclusively through Supabase Auth

/* ==========================================
   DATA ENGINE
========================================== */
async function fetchAllData() {
  if (fetchAllData.inFlight) return fetchAllData.inFlightPromise;

  fetchAllData.inFlight = true;
  fetchAllData.inFlightPromise = (async () => {
    // LAZY INIT CONFIG + CLIENT
    if (!SUPABASE_CONFIG && !sb_client) {
      try {
        console.log("Fetching configuration from /api/config...");
        const res = await Promise.race([
          fetch(`/api/config?t=${Date.now()}`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000),
          ),
        ]);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("Config Error Details:", errorData);
          throw new Error(
            errorData.details ||
              errorData.error ||
              `HTTP error! status: ${res.status}`,
          );
        }

        const config = await res.json();
        if (config && config.url && config.key) {
          SUPABASE_CONFIG = config;
          // Only re-initialize if different or not already initialized
          if (!sb_client || sb_client.supabaseUrl !== config.url) {
            sb_client = window.supabase?.createClient(config.url, config.key);
            if (sb_client) window.sb_client = sb_client;
            console.log("Supabase client initialized from server config.");
          }
        } else {
          throw new Error("Server config returned empty URL or Key");
        }
      } catch (e) {
        console.warn(
          "Config fetch failed, using internal defaults:",
          e.message,
        );
        // Fallback: If we don't have an sb_client yet, use the hardcoded defaults
        if (!sb_client && SUPABASE_URL && SUPABASE_KEY) {
          console.log("Initializing Supabase with hardcoded fallback keys...");
          try {
            sb_client = window.supabase?.createClient(
              SUPABASE_URL,
              SUPABASE_KEY,
            );
            if (sb_client) window.sb_client = sb_client;
          } catch (initErr) {
            console.error("Hardcoded fallback init failed:", initErr);
          }
        }
      }
    }

    if (!sb_client) {
      console.warn("Using fallback data - no Supabase");
      useFallbackData();
      window.hasFetchedHouses = true;
      refreshAllPages();
      return;
    }

    console.log("Cloud fetch START");
    try {
      // REDUCED TIMEOUT (15s instead of 8s - allow slow connections)
      const TIMEOUT = 15000;
      const safeCall = (p) =>
        Promise.race([
          p,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), TIMEOUT),
          ),
        ]);

      // OPTIMIZED: Select only needed columns instead of SELECT *
      const results = await Promise.allSettled([
        // Houses: Only fetch columns actually used in UI
        safeCall(
          sb_client
            .from("houses")
            .select(
              "id, title, school, area, exactLocation, location, type, price, rooms, status, photo, photos, description, contact, amenities, views, created_at",
            )
            .eq("status", "Active")
            .order("created_at", { ascending: false })
            .limit(20),
        ),
        // Reviews: Only fetch recent reviews (last 50)
        safeCall(
          sb_client
            .from("reviews")
            .select("id, name, text, school, avatar, house_id, created_at")
            .order("created_at", { ascending: false })
            .limit(50),
        ),
        // Universities: All columns needed (small table)
        safeCall(
          sb_client
            .from("universities")
            .select("id, name, locations, logo_url, logo_scale"),
        ),
        // Favorites: Only if user is logged in
        ...(window.CACHED_FAVORITES?.length
          ? [
              safeCall(
                sb_client
                  .from("favorites")
                  .select("house_id")
                  .eq("user_id", getCurrentUser()?.id),
              ),
            ]
          : []),
      ]);

      // ROBUST PROCESSING WITH FALLBACKS
      const [listingsRes, reviewsRes, unisRes, favsRes] = results;

      // HOUSES: Fallback to DEFAULT if failed
      if (listingsRes.status === "fulfilled" && !listingsRes.value?.error) {
        CACHED_LISTINGS = (listingsRes.value.data || []).map(normalizeListing);
      } else {
        console.warn(
          "Houses fetch failed → DEFAULT_LISTINGS",
          listingsRes.reason || listingsRes.value?.error,
        );
        CACHED_LISTINGS = DEFAULT_LISTINGS.map(normalizeListing);
      }
      window.hasFetchedHouses = true;

      // REVIEWS: Keep existing if new fetch fails
      if (
        reviewsRes.status === "fulfilled" &&
        reviewsRes.value.data?.length > 0
      ) {
        CACHED_REVIEWS = reviewsRes.value.data;
      }

      // UNIS: Fallback to DEFAULT_UNIVERSITIES
      if (unisRes.status === "fulfilled" && !unisRes.value?.error) {
        window.CLOUD_UNIVERSITIES_DATA = unisRes.value.data || [];
        console.log(
          "Universities fetched:",
          window.CLOUD_UNIVERSITIES_DATA.length,
          "universities",
        );
        console.log("Universities data:", window.CLOUD_UNIVERSITIES_DATA);
        const transformed = {};
        (unisRes.value.data || []).forEach(
          (u) => (transformed[u.name] = u.locations),
        );
        if (Object.keys(transformed).length > 0) {
          CLOUD_UNIVERSITIES = transformed;
        }
      } else {
        console.warn(
          "Unis fetch failed:",
          unisRes.reason || unisRes.value?.error,
        );
        window.CLOUD_UNIVERSITIES_DATA = [];
      }

      // FAVORITES: Merge safely (in-memory only)
      if (favsRes?.status === "fulfilled" && favsRes.value.data) {
        const cloudIds = favsRes.value.data.map((f) => String(f.house_id));
        CACHED_FAVORITES = [
          ...new Set([...CACHED_FAVORITES.map(String), ...cloudIds]),
        ];
      }
    } catch (e) {
      console.error("Cloud batch failed:", e);
      useFallbackData();
    } finally {
      window.hasFetchedHouses = true;
      fetchAllData.inFlight = false;
      fetchAllData.inFlightPromise = null;
      refreshAllPages();
    }
  })();
  return fetchAllData.inFlightPromise;
}

function useFallbackData() {
  CACHED_LISTINGS = DEFAULT_LISTINGS.map(normalizeListing);
  CACHED_REVIEWS = DEFAULT_REVIEWS;
  CLOUD_UNIVERSITIES = DEFAULT_UNIVERSITIES;
  syncUniversitiesCache();
}

// PAGINATED FETCH (for loading more houses on demand)
window.fetchHousesPaginated = async (page = 1, limit = 20, filters = {}) => {
  if (!sb_client) {
    console.warn("No Supabase client for paginated fetch");
    return { data: [], error: "No client" };
  }

  try {
    let query = sb_client
      .from("houses")
      .select(
        "id, title, school, area, exactLocation, location, type, price, rooms, status, photo, photos, description, contact, amenities, views, created_at",
      )
      .eq("status", "Active");

    // Handle sorting
    if (filters.sortBy === "price-low") {
      query = query.order("price", { ascending: true });
    } else if (filters.sortBy === "price-high") {
      query = query.order("price", { ascending: false });
    } else if (filters.sortBy === "name-az") {
      query = query.order("title", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false }); // newest
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (filters.school) query = query.ilike("school", `%${filters.school}%`);
    if (filters.area) query = query.ilike("area", `%${filters.area}%`);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.rooms) {
      if (String(filters.rooms) === "4") {
        query = query.gte("rooms", 4);
      } else {
        query = query.eq("rooms", Number(filters.rooms));
      }
    }
    if (filters.minPrice) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
    if (filters.query) {
      query = query.or(
        `title.ilike.%${filters.query}%,location.ilike.%${filters.query}%,area.ilike.%${filters.query}%,school.ilike.%${filters.query}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: (data || []).map(normalizeListing), error: null };
  } catch (e) {
    console.error("Paginated fetch error:", e);
    return { data: [], error: e.message };
  }
};

window.fetchAdminHouses = async () => {
  if (!sb_client) return [];
  try {
    const { data, error } = await sb_client
      .from("houses")
      .select(
        "id, title, school, area, exactLocation, location, type, price, rooms, status, photo, photos, views, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data || []).map(normalizeListing);
  } catch (e) {
    console.error("Admin fetch error", e);
    return [];
  }
};

// DEBOUNCED SEARCH (prevents excessive API calls while typing)
const searchDebounce = { timer: null };
window.debouncedSearch = async (query, callback, delay = 300) => {
  if (searchDebounce.timer) clearTimeout(searchDebounce.timer);

  searchDebounce.timer = setTimeout(async () => {
    if (!query || query.trim().length < 2) {
      callback([]);
      return;
    }

    try {
      const { data, error } = await sb_client
        .from("houses")
        .select("id, title, school, area, location, type, price, photo, status")
        .or(
          `title.ilike.%${query}%,area.ilike.%${query}%,school.ilike.%${query}%`,
        )
        .limit(20);

      if (error) throw error;
      callback((data || []).map(normalizeListing));
    } catch (e) {
      console.error("Search error:", e);
      callback([]);
    }
  }, delay);
};

function refreshAllPages() {
  requestAnimationFrame(() => {
    syncUniversitiesCache();
    [
      "populateSchoolOptions",
      "renderHome",
      "renderShopGrid",
      "renderDashboard",
      "renderDetailsPage",
    ].forEach((fn) => {
      if (window[fn]) window[fn]();
    });
  });
}

// FAVORITES — in-memory only, synced to Supabase per session

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

// Initialize favorites — load from Supabase only (no localStorage)
async function initFavorites() {
  const user = await fetchSessionUser();
  if (user && sb_client) {
    try {
      const {
        data: { user: authUser },
      } = await sb_client.auth.getUser();
      if (authUser) {
        const { data: favs } = await sb_client
          .from("favorites")
          .select("house_id")
          .eq("user_id", authUser.id);
        if (favs) {
          CACHED_FAVORITES = favs.map((f) => String(f.house_id));
        }
      }
    } catch (e) {}
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
  return null;
}

window.updateUniversityLogoScale = async (uniId, scale) => {
  if (!sb_client) return { success: false };
  try {
    const { error } = await sb_client
      .from("universities")
      .update({ logo_scale: parseFloat(scale) })
      .eq("id", uniId);

    if (!error) {
      if (window.fetchAllData) await window.fetchAllData();
      return { success: true };
    }
    return { success: false, error };
  } catch (e) {
    return { success: false, error: e };
  }
};

window.updateUniversityLogo = async (uniId, url) => {
  if (!sb_client) return { success: false };
  try {
    const { error } = await sb_client
      .from("universities")
      .update({ logo_url: url })
      .eq("id", uniId);

    if (!error) {
      if (window.fetchAllData) await window.fetchAllData();
      return { success: true };
    }
    return { success: false, error };
  } catch (e) {
    return { success: false, error: e };
  }
};

window.addUniversity = async (name) => {
  if (!sb_client) return { success: false };
  try {
    const { error } = await sb_client
      .from("universities")
      .insert([{ name, locations: [], logo_url: "", logo_scale: 1.1 }]);
    if (!error) {
      if (typeof CLOUD_UNIVERSITIES !== "undefined")
        CLOUD_UNIVERSITIES[name] = [];
      if (window.NIGERIA_UNIVERSITIES) window.NIGERIA_UNIVERSITIES[name] = [];
      if (window.fetchAllData) window.fetchAllData();
      return { success: true };
    }
    return { success: false, error };
  } catch (e) {
    return { success: false, error: e };
  }
};

window.addAreaToUniversity = async (schoolName, areaName) => {
  if (!sb_client) return { success: false };
  try {
    // First get current areas
    const { data } = await sb_client
      .from("universities")
      .select("id, locations")
      .eq("name", schoolName)
      .single();

    if (!data)
      return { success: false, error: { message: "University not found" } };

    const currentAreas = data.locations || [];
    if (currentAreas.includes(areaName)) return { success: true }; // Already exists

    const { error } = await sb_client
      .from("universities")
      .update({ locations: [...currentAreas, areaName] })
      .eq("id", data.id);

    if (!error) {
      const newLocations = [...currentAreas, areaName];
      if (
        typeof CLOUD_UNIVERSITIES !== "undefined" &&
        CLOUD_UNIVERSITIES[schoolName]
      ) {
        CLOUD_UNIVERSITIES[schoolName] = newLocations;
      }
      if (
        window.NIGERIA_UNIVERSITIES &&
        window.NIGERIA_UNIVERSITIES[schoolName]
      ) {
        window.NIGERIA_UNIVERSITIES[schoolName] = newLocations;
      }
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
  return _currentUser || null;
}

async function fetchSessionUser() {
  if (!sb_client) return getCurrentUser();

  // High-Performance Timeout Race
  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("Timeout")), 10000),
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

    _currentUser = {
      id: data.user.id,
      name: profile?.full_name || meta.full_name || "Student",
      email: data.user.email,
      university: profile?.university || meta.university || "Lagos",
      role: profile?.role || meta.role || "student",
      avatar_url: data.user.user_metadata?.avatar_url || "",
    };
    return _currentUser;
  } catch (err) {
    console.warn("Session Recovery: Using local cache due to latency/error.");
    return getCurrentUser();
  }
}

async function ensureAdminAccess() {
  console.log("Admin security check initializing...");

  // Wait up to 3 seconds for Supabase client to initialize if it hasn't yet
  for (let i = 0; i < 15; i++) {
    if (window.sb_client) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  try {
    const user = await fetchSessionUser();
    console.log("Session User Resolved:", user?.email, "| Role:", user?.role);

    if (user && user.role === "admin") {
      console.log("Access Granted: Admin confirmed.");
      return true;
    }

    // Safety net: fresh local check
    const localUser = getCurrentUser();
    if (localUser && localUser.role === "admin") {
      console.log("Access Granted: Local admin session found.");
      return true;
    }
  } catch (e) {
    console.error("Admin Access Security Check Error:", e);
  }

  console.warn("Access Denied: Redirecting to home.");
  window.location.href = "../home/home.html";
  return false;
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
      _currentUser = user;
      return { success: true, user };
    }
  }
  const admin = SYSTEM_ADMINS.find(
    (u) => u.email.toLowerCase() === checkEmail && u.password === password,
  );
  if (admin) {
    _currentUser = admin;
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
  if (confirm("Reset session and return to home?")) {
    _currentUser = null;
    CACHED_LISTINGS = [];
    CACHED_REVIEWS = [...DEFAULT_REVIEWS];
    CLOUD_UNIVERSITIES = {};
    CACHED_FAVORITES = [];
    window.hasFetchedHouses = false;
    window.location.href = "../home/home.html";
  }
}

let __isLoggingOut = false;
async function logoutUser() {
  if (__isLoggingOut) return false;
  __isLoggingOut = true;
  try {
    if (sb_client) await sb_client.auth.signOut();
  } catch (e) {
    console.warn("Logout failed (continuing):", e);
  } finally {
    _currentUser = null;
    __isLoggingOut = false;
    window.location.href = "../home/home.html";
  }
}

// RE-ENABLED Forgot Password with DEBOUNCE (1 call/min)
const resetDebounce = { lastCall: 0, pending: null };
async function resetPasswordForEmail(email) {
  const now = Date.now();
  if (now - resetDebounce.lastCall < 60000) {
    console.warn("Reset password debounced. Please wait.");
    return { success: false, message: "Please wait 1 minute between requests" };
  }

  if (resetDebounce.pending) clearTimeout(resetDebounce.pending);

  return new Promise((resolve) => {
    console.log("Setting timeout for reset request...");
    resetDebounce.pending = setTimeout(async () => {
      try {
        console.log(
          "Sending POST request to /api/auth/forgot-password for:",
          email,
        );
        const response = await Promise.race([
          fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.toLowerCase().trim() }),
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10000),
          ),
        ]);

        console.log("API response status:", response.status);
        const data = await response.json();
        console.log("API response data:", data);

        resetDebounce.lastCall = Date.now();
        resolve({ success: response.ok, message: data.message || data.error });
      } catch (e) {
        console.error("Fetch error in resetPasswordForEmail:", e);
        resolve({ success: false, message: "Network error" });
      }
    }, 500);
  });
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
  return `<div class="empty-state">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #F97316)" stroke-width="1.5" style="margin-bottom:1rem;opacity:0.6"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    <h3>${title}</h3>
    <p>${message}</p>
  </div>`;
}

function ensureGlobalFavicon() {
  const faviconHref = "/assets/logo.png";
  const existing =
    document.querySelector("link[rel='icon']") ||
    document.querySelector("link[rel='shortcut icon']");

  if (existing) {
    existing.setAttribute("href", faviconHref);
    return;
  }

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = faviconHref;
  document.head.appendChild(link);
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
  const centerZone = head.querySelector(".nav-center");

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
    if (centerZone) {
      centerZone.appendChild(idBox);
    } else if (rightZone) {
      rightZone.insertBefore(idBox, toggle);
    }
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
        (window.getUniversityLogo ? getUniversityLogo(uniName) : "") ||
        "";
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

    // Mark toggle as ready to transition from skeleton
    const toggle = document.querySelector(".mobile-menu-toggle");
    if (toggle) toggle.classList.add("is-ready");

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
  ensureGlobalFavicon();

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
window.getListingByIdFromDb = async (id) => {
  if (!sb_client) return null;
  try {
    const { data, error } = await sb_client
      .from("houses")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return normalizeListing(data);
  } catch (e) {
    return null;
  }
};
window.DEFAULT_LISTINGS = DEFAULT_LISTINGS;
window.getCurrentUser = getCurrentUser;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.resetPasswordForEmail = resetPasswordForEmail;
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
window.compressImage = (file, maxWidth = 1024) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = maxWidth / img.width;
        canvas.width = Math.min(img.width, maxWidth);
        canvas.height =
          canvas.width !== img.width ? img.height * ratio : img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) =>
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
              }),
            ),
          "image/jpeg",
          0.8,
        );
      };
    };
  });
};

window.uploadPhotoToStorage = async (file) => {
  if (!sb_client) return null;
  // Compress massively large phone photos natively via Canvas before network transit!
  let uploadFile = file;
  if (file.type.startsWith("image/")) {
    uploadFile = await window.compressImage(file, 1080);
  }
  const fileName = `house_${Math.random().toString(36).slice(2)}_${Date.now()}.jpg`;
  const { error } = await sb_client.storage
    .from("house-photos")
    .upload(`public/${fileName}`, uploadFile, { contentType: "image/jpeg" });
  if (error) {
    console.error("Storage upload error:", error);
    return null;
  }
  const { data } = sb_client.storage
    .from("house-photos")
    .getPublicUrl(`public/${fileName}`);
  return data.publicUrl;
};

window.logAudit = async (action, entity_type, entity_id, details = {}) => {
  if (!sb_client) return;
  const user = await window.fetchSessionUser();
  if (user) {
    await sb_client.from("audit_logs").insert([
      {
        admin_id: user.id,
        admin_name: user.name || user.email || "Unknown",
        action,
        entity_type,
        entity_id: String(entity_id),
        details,
      },
    ]);
  }
};

window.addListing = async (h) => {
  if (!sb_client) return { success: false };
  const payload = normalizeListing(h);
  if (typeof CACHED_LISTINGS !== "undefined") {
    CACHED_LISTINGS.unshift({ ...payload, id: Date.now() });
  }
  const { data, error } = await sb_client
    .from("houses")
    .insert([payload])
    .select();
  if (!error) {
    if (data && data[0])
      window.logAudit("CREATE", "HOUSE", data[0].id, { title: payload.title });
    fetchAllData();
  }
  return { success: !error };
};
window.deleteListing = async (id) => {
  if (!sb_client) return { success: false };
  if (typeof CACHED_LISTINGS !== "undefined") {
    CACHED_LISTINGS = CACHED_LISTINGS.filter(
      (l) => String(l.id) !== String(id),
    );
  }
  const { error } = await sb_client.from("houses").delete().eq("id", id);
  if (!error) {
    window.logAudit("DELETE", "HOUSE", id, {});
    fetchAllData();
  }
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
  const { id, ...updates } = h;
  if (typeof CACHED_LISTINGS !== "undefined") {
    const idx = CACHED_LISTINGS.findIndex((l) => String(l.id) === String(id));
    if (idx !== -1) {
      CACHED_LISTINGS[idx] = { ...CACHED_LISTINGS[idx], ...updates };
    }
  }
  const { error } = await sb_client.from("houses").update(updates).eq("id", id);
  if (!error) {
    window.logAudit("UPDATE", "HOUSE", id, {
      updated_keys: Object.keys(updates),
    });
    fetchAllData();
  }
  return { success: !error, error };
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
