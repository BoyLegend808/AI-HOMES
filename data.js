// studenthome global data & auth
const STORAGE_KEY = "studenthome_listings";
const USERS_KEY = "studenthome_users";
const AUTH_KEY = "studenthome_auth";
const UNIVERSITIES_KEY = "studenthome_unis";
const REVIEWS_KEY = "studenthome_reviews";

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

// FULL HOUSE TYPES
const HOUSE_TYPES = ["1 Bedroom", "2 Bedroom", "3 Bedroom", "Self-contain", "Single Room", "Shared Room", "Mini Flat", "Studio Apartment"];

const defaultData = [
  {
    id: 1,
    title: "Luxury Self-Con at Presco",
    school: "EBSU",
    area: "Presco",
    type: "Self-contain",
    price: 150000,
    rooms: 1,
    status: "Active",
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1de2d9d0c0?fit=crop&w=400&q=80"
    ],
    description: "Premium self-contain with steady light and water. Just 2 mins from gate.",
    contact: { phone: "08012345678", whatsapp: "08012345678" }
  },
  {
    id: 2,
    title: "Spacious 2 Bed Flat - Hilltop",
    school: "UNN",
    area: "Hilltop",
    type: "2 Bedroom",
    price: 280000,
    rooms: 2,
    status: "Active",
    photos: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?fit=crop&w=400&q=80"
    ],
    description: "Great for friends sharing. Very quiet and safe.",
    contact: { phone: "08198765432", whatsapp: "08198765432" }
  },
  {
    id: 3,
    title: "Akoka Modern Studio",
    school: "UNILAG",
    area: "Akoka",
    type: "Studio Apartment",
    price: 350000,
    rooms: 1,
    status: "Active",
    photos: [
      "https://images.unsplash.com/photo-1536376073347-4573968d90cb?fit=crop&w=400&q=80"
    ],
    description: "Fast WiFi, backup power, and modern fittings. Best for serious students.",
    contact: { phone: "07033334444", whatsapp: "07033334444" }
  }
];

const defaultReviews = [
  { id: 1, name: "Chiamaka N.", school: "UNILAG Student", text: "Finding a place in Akoka used to be a nightmare. StudentHome saved me so much stress!", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { id: 2, name: "Obinna E.", school: "UNN Student", text: "Direct WhatsApp with the landlord was a game changer. Got my Hilltop lodge in 2 days.", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { id: 3, name: "Aisha K.", school: "ABU Student", text: "Mapped exactly where my faculty was. Found my Samaru room instantly!", avatar: "https://randomuser.me/api/portraits/women/90.jpg" }
];

// INITIALIZATION
if (!localStorage.getItem(UNIVERSITIES_KEY)) localStorage.setItem(UNIVERSITIES_KEY, JSON.stringify(DEFAULT_UNIVERSITIES));
if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify([]));
if (!localStorage.getItem(REVIEWS_KEY)) localStorage.setItem(REVIEWS_KEY, JSON.stringify(defaultReviews));

/* ==========================================
   DATA GETTERS/SETTERS
========================================== */
function getUniversities() { try { return JSON.parse(localStorage.getItem(UNIVERSITIES_KEY)); } catch(e) { return DEFAULT_UNIVERSITIES; } }
function getListings() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { return []; } }
function saveListings(l) { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); }
function getListingById(id) { return getListings().find(l => l.id == id); }
function getUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY)); } catch(e) { return []; } }
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function getReviews() { try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)); } catch(e) { return []; } }

/* ==========================================
   AUTH LOGIC
========================================== */
function getCurrentUser() { const u = localStorage.getItem(AUTH_KEY); return u ? JSON.parse(u) : null; }
function logoutUser() { localStorage.removeItem(AUTH_KEY); window.location.href = "home.html"; }
function loginUser(email, password) {
  const checkEmail = email.toLowerCase().trim();
  const user = [...SYSTEM_ADMINS, ...SYSTEM_STUDENTS, ...getUsers()].find(u => u.email.toLowerCase() === checkEmail && u.password === password);
  if(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { success: true, user };
  }
  return { success: false, message: "Invalid credentials" };
}
function registerUser(data) {
  data.role = "student";
  const users = getUsers();
  if (SYSTEM_ADMINS.find(admin => admin.email.toLowerCase() === data.email.toLowerCase())) return { success: false, message: "Email reserved." };
  if(users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) return { success: false, message: "Email exists." };
  users.push(data);
  saveUsers(users);
  return { success: true };
}

/* ==========================================
   MOBILE NAVIGATION CONTROLLER (SENIOR REFACTOR)
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

  // Header & Overlay Check
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

  // Delegation
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
document.addEventListener('DOMContentLoaded', () => {
    renderGlobalNav();
    initReveal();
    
    // Global Outside Click Detection
    document.addEventListener('click', (e) => {
      const nav = document.querySelector('.nav-links');
      const toggle = document.querySelector('.mobile-menu-toggle');
      if (!nav || !nav.classList.contains('active')) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        closeMobileMenu();
      }
    });

    // Android Scroll Fix
    const scroller = document.querySelector('.testimonial-scroller');
    if(scroller) {
       scroller.addEventListener('touchstart', () => { window.isManualScrolling = true; }, {passive: true});
       scroller.addEventListener('touchend', () => { window.isManualScrolling = false; }, {passive: true});
    }
});

// EXPORT TO WINDOW
window.NIGERIA_UNIVERSITIES = getUniversities();
window.HOUSE_TYPES = HOUSE_TYPES;
window.getListings = getListings;
window.saveListings = saveListings;
window.getListingById = getListingById;
window.getCurrentUser = getCurrentUser;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.getUniversities = getUniversities;
window.getReviews = getReviews;
window.getEmptyStateHTML = getEmptyStateHTML;
