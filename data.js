// studenthome global data & Supabase Integration
const STORAGE_KEY = "studenthome_listings";
const USERS_KEY = "studenthome_users";
const AUTH_KEY = "studenthome_auth";
const UNIVERSITIES_KEY = "studenthome_unis";
const REVIEWS_KEY = "studenthome_reviews";

// 🚀 SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://loapruxjeolxyngmcszf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MJiWLJjrftbcBQ1snxpIMg_vCxU29cg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// GLOBAL CACHE
let CACHED_LISTINGS = [];
let CACHED_REVIEWS = [];

/* ==========================================
   ADMIN DATABASE (EDIT THIS TO ADD ADMINS)
========================================== */
const SYSTEM_ADMINS = [
  { name: "Main Admin", email: "admin@studenthome.com", password: "admin", role: "admin" },
  { name: "Owner", email: "owner@studenthome.com", password: "owner123", role: "admin" }
];

const SYSTEM_STUDENTS = [
  { name: "EBSU Fresher", email: "ebsu@student.com", password: "123", role: "student" }
];

const DEFAULT_UNIVERSITIES = {
  "EBSU": ["Presco", "Palmsite", "Town", "CAS", "Ishieke", "Front Gate"],
  "UNN": ["Hilltop", "Odenigwe", "Behind Flat", "Zik's Flat", "Greenview"],
  "UNILAG": ["Akoka", "Yaba", "Bariga", "Onike"],
  "ABU": ["Samaru", "Kongo", "Shika", "Aviation"],
  "UI": ["Agbowo", "Orogun", "Bodija"],
  "OAU": ["Gate", "Ife Town", "Ede Road"]
};

const HOUSE_TYPES = ["1 Bedroom", "2 Bedroom", "3 Bedroom", "Self-contain", "Single Room", "Shared Room", "Mini Flat", "Studio Apartment"];

/* ==========================================
   DATA GETTERS/SETTERS (SUPABASE POWERED)
========================================== */
async function fetchAllData() {
  try {
    const [listingsRes, reviewsRes] = await Promise.all([
      supabase.from('houses').select('*').order('created_at', { ascending: false }),
      supabase.from('reviews').select('*').order('created_at', { ascending: false })
    ]);
    
    if (listingsRes.data) CACHED_LISTINGS = listingsRes.data;
    if (reviewsRes.data) CACHED_REVIEWS = reviewsRes.data;
    
    // Trigger any page-specific renders that depend on data
    if (window.renderHome) window.renderHome();
    if (window.renderShopGrid) window.renderShopGrid(CACHED_LISTINGS);
    if (window.renderAdminDashboard) window.renderAdminDashboard();
  } catch(e) {
    console.warn("Supabase Fetch Error:", e);
    // Fallback to local storage if DB fails
    CACHED_LISTINGS = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }
}

function getListings() { return CACHED_LISTINGS; }
function getReviews() { return CACHED_REVIEWS; }
function getListingById(id) { return CACHED_LISTINGS.find(l => l.id == id); }
function getUniversities() { return DEFAULT_UNIVERSITIES; } // Hardcoded for consistency

async function saveListings(l) { 
  // In production, we'd use supabase.from('houses').upsert(l)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); 
}

/* ==========================================
   AUTH LOGIC (SUPABASE AUTH READY)
========================================== */
function getCurrentUser() { 
  const u = localStorage.getItem(AUTH_KEY); 
  return u ? JSON.parse(u) : null; 
}

async function loginUser(email, password) {
  const checkEmail = email.toLowerCase().trim();
  
  // 1. Check Hardcoded Admins First (for prototype convenience)
  const admin = [...SYSTEM_ADMINS, ...SYSTEM_STUDENTS].find(u => u.email.toLowerCase() === checkEmail && u.password === password);
  if(admin) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(admin));
    return { success: true, user: admin };
  }

  // 2. Real Supabase Auth Integration
  const { data, error } = await supabase.auth.signInWithPassword({
    email: checkEmail,
    password: password
  });

  if (error) return { success: false, message: error.message };
  
  const user = { name: data.user.email.split('@')[0], email: data.user.email, role: 'student' };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return { success: true, user };
}

async function registerUser(data) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.name } }
  });

  if (error) return { success: false, message: error.message };
  return { success: true };
}

function logoutUser() { 
  supabase.auth.signOut();
  localStorage.removeItem(AUTH_KEY); 
  window.location.href = "home.html"; 
}

/* ==========================================
   MOBILE NAVIGATION CONTROLLER
========================================== */
function toggleMobileMenu(e) {
  if (e) e.stopPropagation();
  const nav = document.querySelector('.nav-links');
  const overlay = document.querySelector('.nav-overlay');
  if (!nav || !overlay) return;
  
  const isOpen = nav.classList.contains('active');
  if (isOpen) {
    closeMobileMenu();
  } else {
    nav.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const nav = document.querySelector('.nav-links');
  const overlay = document.querySelector('.nav-overlay');
  if(nav) nav.classList.remove('active');
  if(overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function renderGlobalNav() {
  const user = getCurrentUser();
  const navContainer = document.querySelector('.nav-links');
  if(!navContainer) return;

  const head = document.querySelector('.top-nav');
  if(head && !document.querySelector('.mobile-menu-toggle')) {
    const btn = document.createElement('button');
    btn.className = 'mobile-menu-toggle';
    btn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    btn.onclick = toggleMobileMenu;
    head.appendChild(btn);
  }
  
  if(!document.querySelector('.nav-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.onclick = closeMobileMenu;
    document.body.appendChild(overlay);
  }

  const currentPath = window.location.pathname;
  const isActive = (path) => currentPath.includes(path) ? 'active' : '';

  let html = `
    <a href="home.html" data-nav-link class="${isActive('home.html')}">Home</a>
    <a href="shop.html" data-nav-link class="${isActive('shop.html')}">Search Houses</a>
    <a href="about.html" data-nav-link class="${isActive('about.html')}">About Us</a>
    <a href="contact.html" data-nav-link class="${isActive('contact.html')}">Contact</a>
  `;

  if(user) {
    if(user.role === 'admin') html += `<a href="admin.html" data-nav-link class="${isActive('admin.html')}">Admin Panel</a>`;
    html += `<a href="#" data-logout-btn style="color:var(--accent); font-weight:700;">Logout</a>`;
  } else {
    html += `<a href="auth.html" data-nav-link class="${isActive('auth.html')}">Login</a>`;
    html += `<a href="auth.html?mode=register" data-nav-link class="hero-btn" style="padding: 0.5rem 1.2rem; margin-left:1rem; font-size:0.9rem;">Join Now</a>`;
  }
  
  navContainer.innerHTML = html;

  navContainer.onclick = (e) => {
    if (e.target.closest('[data-nav-link]')) closeMobileMenu();
    if (e.target.closest('[data-logout-btn]')) { e.preventDefault(); closeMobileMenu(); logoutUser(); }
  };
}

/* ==========================================
   UI UTILITIES
========================================== */
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function getEmptyStateHTML(title = "No results found", subtext = "Try adjusting your search.") {
  return `
    <div class="empty-state">
      <div class="empty-illustration">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </div>
      <h3 class="empty-heading">${title}</h3>
      <p class="empty-subtext">${subtext}</p>
      <button class="btn-clear" onclick="window.location.reload()">Reset Search</button>
    </div>
  `;
}

/* ==========================================
   LIFECYCLE
========================================== */
document.addEventListener('DOMContentLoaded', async () => {
    renderGlobalNav();
    initReveal();
    
    // START DB FETCH
    await fetchAllData();
    
    document.addEventListener('click', (e) => {
      const nav = document.querySelector('.nav-links');
      const toggle = document.querySelector('.mobile-menu-toggle');
      if (!nav || !nav.classList.contains('active')) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        closeMobileMenu();
      }
    });

    const scroller = document.querySelector('.testimonial-scroller');
    if(scroller) {
       scroller.addEventListener('touchstart', () => { window.isManualScrolling = true; }, {passive: true});
       scroller.addEventListener('touchend', () => { window.isManualScrolling = false; }, {passive: true});
    }
});

// EXPORT TO WINDOW
window.supabase = supabase;
window.getListings = getListings;
window.getReviews = getReviews;
window.getListingById = getListingById;
window.getCurrentUser = getCurrentUser;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.getUniversities = getUniversities;
window.getEmptyStateHTML = getEmptyStateHTML;
window.HOUSE_TYPES = HOUSE_TYPES;
window.NIGERIA_UNIVERSITIES = DEFAULT_UNIVERSITIES;
