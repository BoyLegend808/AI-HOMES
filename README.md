# StudentHome - Student Housing Platform

A modern, production-level frontend for a student housing platform built with HTML5, CSS3, and vanilla JavaScript.

## 🎨 Design System

### Colors
- **Primary**: Orange (#F97316)
- **Background**: Dark navy/charcoal (#0F172A)
- **Cards**: Slightly lighter dark (#1E293B)
- **Text**: White/light gray (#E2E8F0)
- **Muted**: (#94A3B8)

### Style
- Modern, minimal, clean design
- Large typography
- Soft shadows
- Rounded corners (2xl)
- Generous spacing

## 📱 Pages

### 1. Onboarding Page (`Onboarding.html`)
- Full-screen hero with dark overlay
- Centered headline: "Find student housing, stress-free"
- Subtext: "Verified homes near your campus"
- Primary CTA button: "Get Started"
- Feature icons: Search, Saved, Contact

### 2. Home Page (`home.html`)
- Header with logo and navigation
- Large search bar with placeholder
- Quick filter chips (horizontal scroll)
- Featured listings (horizontal scroll cards)
- Category cards: Near You, Affordable, Luxury
- How It Works section
- Testimonials

### 3. Listings Page (`listings.html`)
- Sticky header with back button and search
- Filter chips (Price, Rooms, Type, Distance)
- Sidebar filters panel
- Vertical property cards
- Floating "Map View" button
- Bottom sheet modal for filters

### 4. House Details Page (`details.html`)
- Image gallery with thumbnails and navigation
- Property info (price, location, availability)
- Key specs (beds, bath, distance)
- Expandable description
- Features/amenities list
- Trust section with verified badge
- Landlord info with rating
- Sticky bottom CTA

### 5. Admin Dashboard (`admin.html`)
- Dashboard header with stats
- Stats cards (Total, Active, Hidden, Views)
- Search functionality
- Listings table with actions
- Mobile-responsive card view

### 6. Add/Edit Listing Page (`admin-form.html`)
- Multi-step form (4 steps)
- Progress indicator
- Step 1: Basic Info (Title, Location, Price)
- Step 2: Details (Rooms, Type, Amenities)
- Step 3: Photos (Drag & drop upload)
- Step 4: Description & Contact
- Preview modal before saving

## 🛠️ Technical Features

### JavaScript Functionality
- Mobile menu toggle
- Filter interactions
- Image gallery navigation
- Multi-step form navigation
- Photo upload with preview
- Modal/bottom sheet interactions
- Form validation
- Local storage for data persistence

### CSS Features
- Mobile-first responsive design
- CSS Grid and Flexbox layouts
- Smooth transitions and animations
- Custom scrollbars
- Sticky elements
- Soft shadows and gradients

### Responsive Breakpoints
- Mobile: < 480px
- Tablet: 480px - 768px
- Desktop: > 768px

## 📁 File Structure

```
StudentHome/
├── Onboarding.html      # Landing/onboarding page
├── home.html            # Home page
├── listings.html        # Listings page
├── details.html         # Property details page
├── admin.html           # Admin dashboard
├── admin-form.html      # Add/Edit listing form
├── styles.css           # Main shared styles
├── home.css             # Home page styles
├── listings.css         # Listings page styles
├── details.css          # Details page styles
├── admin.css            # Admin dashboard styles
├── admin-form.css       # Form styles
├── script.js            # Main application logic
├── home.js              # Home page logic
├── listings.js          # Listings page logic
├── details.js           # Details page logic
├── admin.js             # Admin dashboard logic
├── admin-form.js        # Form logic
├── data.js              # Data management
└── README.md            # This file
```

## 🚀 Getting Started

1. Open `Onboarding.html` in a web browser
2. Click "Get Started" to navigate to the home page
3. Browse listings, view details, and explore the admin dashboard

## 🎯 Key Features

### User Features
- ✅ Browse featured listings
- ✅ Search by location, price, type
- ✅ Filter listings with chips
- ✅ View property details with image gallery
- ✅ Contact landlords
- ✅ Save favorite properties

### Admin Features
- ✅ Dashboard with statistics
- ✅ Add new listings (multi-step form)
- ✅ Edit existing listings
- ✅ Delete listings
- ✅ Search and filter listings
- ✅ Upload property photos

## 🎨 Design Highlights

- **Premium Feel**: Clean, minimal design that feels like a funded startup product
- **Dark Theme**: Modern dark navy/charcoal color scheme
- **Orange Accents**: Vibrant orange (#F97316) for CTAs and highlights
- **Smooth Interactions**: Hover effects, transitions, and animations
- **Mobile-First**: Fully responsive across all devices
- **Accessible**: Proper contrast ratios and semantic HTML

## 🔧 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 Notes

- Full-stack integration with Supabase (Database, Auth, and Storage Buckets)
- High-performance caching layers via data.js
- Designed for modern browsers

## 🎯 Goal

A real-world, modern housing app UI that looks and feels like a production application from a funded startup.

---

Built with ❤️ using HTML5, CSS3, and Vanilla JavaScript
