// studenthome global data & auth
const STORAGE_KEY = "studenthome_listings";
const USERS_KEY = "studenthome_users";
const AUTH_KEY = "studenthome_auth";

/* ==========================================
   ADMIN DATABASE (EDIT THIS TO ADD ADMINS)
========================================== */
const SYSTEM_ADMINS = [
  { 
    name: "Main Admin", 
    email: "admin@studenthome.com", 
    password: "admin", 
    role: "admin" 
  },
  { 
    name: "Owner", 
    email: "owner@studenthome.com", 
    password: "owner123", 
    role: "admin" 
  }
  // Add more admins here like the above objects
];

/* ==========================================
   STUDENT DATABASE (HARDCODED TEST ACCOUNTS)
========================================== */
const SYSTEM_STUDENTS = [
  {
    name: "EBSU Fresher",
    email: "ebsu@student.com",
    password: "123",
    role: "student"
  }
];

const NIGERIA_UNIVERSITIES = {
  "EBSU": ["Presco", "Palmsite", "Town", "CAS"],
  "UNN": ["Hilltop", "Odenigwe", "Behind Flat", "Zik's Flat"],
  "UNILAG": ["Akoka", "Yaba", "Bariga"],
  "ABU": ["Samaru", "Kongo", "Shika"]
};

const HOUSE_TYPES = ["1 Bedroom", "2 Bedroom", "3 Bedroom", "Self-contain", "Single Room", "Shared Room"];

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
      "https://images.unsplash.com/photo-1502672260266-1c1de2d9d0c0?fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?fit=crop&w=400&q=80"
    ],
    description: "A very nice self-contain apartment located just 5 minutes from the Presco campus gate. Features steady water, prepaid meter, and excellent security.",
    contact: { phone: "08012345678", whatsapp: "08012345678" }
  },
  {
    id: 2,
    title: "2 Bedroom Flat near Palmsite",
    school: "EBSU",
    area: "Palmsite",
    type: "2 Bedroom",
    price: 250000,
    rooms: 2,
    status: "Active",
    photos: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?fit=crop&w=400&q=80"
    ],
    description: "Spacious two-bedroom flat suitable for friends to share. Good road network and very serene environment ideal for deep study sessions.",
    contact: { phone: "08198765432", whatsapp: "08198765432" }
  },
  {
    id: 3,
    title: "Hilltop Boys Quarters",
    school: "UNN",
    area: "Hilltop",
    type: "Single Room",
    price: 80000,
    rooms: 1,
    status: "Active",
    photos: [
      "https://images.unsplash.com/photo-1598928506311-c55f435ce08f?fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1556020685-e631950d2bbf?fit=crop&w=400&q=80"
    ],
    description: "Highly affordable room for a student. Very close to the main gate. Comes with essential shared amenities and a great student community.",
    contact: { phone: "07033334444", whatsapp: "07033334444" }
  }
];

if (!localStorage.getItem(STORAGE_KEY)) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}

// We only store normal user accounts in localStorage now to prevent spoofing.
if (!localStorage.getItem(USERS_KEY)) {
  localStorage.setItem(USERS_KEY, JSON.stringify([]));
}

function getListings() { 
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } 
  catch(e) { return []; } 
}
function saveListings(l) { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); }
function getListingById(id) { return getListings().find(l => l.id == id); }
function addListing(house) {
  const l = getListings();
  l.push(house);
  saveListings(l);
}
function updateListing(house) {
  const l = getListings();
  const idx = l.findIndex(h => h.id == house.id);
  if(idx > -1) l[idx] = house;
  saveListings(l);
}
function deleteListing(id) {
  let l = getListings();
  l = l.filter(h => h.id != id);
  saveListings(l);
}

function getUsers() { 
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } 
  catch(e) { return []; } 
}
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

function registerUser(data) {
  // Hardcode assignment so any registration via UI is STRICTLY a student.
  data.role = "student"; 
  
  const users = getUsers();
  // Check if someone is trying to register with a system admin email
  if (SYSTEM_ADMINS.find(admin => admin.email.toLowerCase() === data.email.toLowerCase())) {
    return { success: false, message: "Email is reserved by system." };
  }
  if(users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) return { success: false, message: "Email already exists" };
  
  users.push(data);
  saveUsers(users);
  return { success: true };
}

function loginUser(email, password) {
  const checkEmail = email.toLowerCase().trim();
  
  // 1. Check if it's a special System Admin 
  const admin = SYSTEM_ADMINS.find(u => u.email.toLowerCase() === checkEmail && u.password === password);
  if(admin) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(admin));
    return { success: true, user: admin };
  }
  
  // 1.5 Check if it's a hardcoded System Student
  const sysStudent = SYSTEM_STUDENTS.find(u => u.email.toLowerCase() === checkEmail && u.password === password);
  if(sysStudent) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(sysStudent));
    return { success: true, user: sysStudent };
  }
  
  // 2. Otherwise check normal student users
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === checkEmail && u.password === password);
  if(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { success: true, user };
  }
  
  return { success: false, message: "Invalid credentials" };
}

function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "home.html";
}

function getCurrentUser() {
  const u = localStorage.getItem(AUTH_KEY);
  return u ? JSON.parse(u) : null;
}

function renderGlobalNav() {
  const user = getCurrentUser();
  const navContainer = document.querySelector('.nav-links');
  if(!navContainer) return;

  const currentPath = window.location.pathname.split('/').pop() || 'home.html';
  const isActive = (path) => currentPath === path || (path==='shop.html' && currentPath==='listings.html') ? 'active' : '';

  let html = `
    <a href="home.html" class="${isActive('home.html')}">Home</a>
    <a href="shop.html" class="${isActive('shop.html')}">Shop</a>
    <a href="contact.html" class="${isActive('contact.html')}">Contact</a>
    <a href="about.html" class="${isActive('about.html')}">About</a>
  `;

  if(user) {
    if(user.role === 'admin') {
       html += `<a href="admin.html" class="${isActive('admin.html')}">Admin</a>`;
    }
    html += `<a href="#" onclick="logoutUser()">Logout</a>`;
  } else {
    html += `<a href="auth.html" class="${isActive('auth.html')}">Login</a>`;
  }
  
  navContainer.innerHTML = html;
}

window.NIGERIA_UNIVERSITIES = NIGERIA_UNIVERSITIES;
window.HOUSE_TYPES = HOUSE_TYPES;
window.getListings = getListings;
window.saveListings = saveListings;
window.getListingById = getListingById;
window.addListing = addListing;
window.updateListing = updateListing;
window.deleteListing = deleteListing;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;

document.addEventListener('DOMContentLoaded', () => {
    renderGlobalNav();
});
