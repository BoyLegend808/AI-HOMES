# Video Tours Integration for StudentHome

## Overview
Add video tour functionality to give students visual confirmation of properties before contacting landlords. This includes video upload, storage, playback, and display across the platform.

## Implementation Plan

### Phase 1: Database & Storage Setup

**File: supabase-safe-migration.sql**

1. **Create Video Storage Bucket** (after line 313):
```sql
insert into storage.buckets (id, name, public)
values ('house-videos', 'house-videos', true)
on conflict (id) do nothing;

create policy "Allow public access to house-videos"
  on storage.objects for all
  using (bucket_id = 'house-videos');
```

2. **Add Video URL Column to Houses Table** (after line ~60):
```sql
alter table public.houses add column if not exists video_url text;
alter table public.houses add column if not exists video_thumbnail text;
```

### Phase 2: Admin Form - Video Upload

**File: admin-form/admin-form.html**

Add video upload section after photo upload (after line 118):
```html
<div class="form-group">
  <label>Upload Video Tour (Optional)</label>
  <div class="upload-zone video-upload-zone">
    <div id="video-upload-label">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
      <p>Click or Drag video to upload</p>
      <span class="video-hint">MP4, Max 50MB (30-60 sec recommended)</span>
    </div>
    <input type="file" id="video-upload" accept="video/mp4,video/webm" style="opacity:0; position:absolute; inset:0; cursor:pointer;">
    <div id="video-preview-container" style="display:none;">
      <video id="video-preview" controls style="max-width:100%; border-radius:12px;"></video>
      <button type="button" onclick="removeVideo()" class="btn-remove-video">Remove Video</button>
    </div>
  </div>
</div>
```

**File: admin-form/admin-form.css**

Add video upload styling:
```css
.video-upload-zone {
  min-height: 200px;
}

.video-hint {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

#video-preview-container {
  position: relative;
  padding: 1rem;
}

.btn-remove-video {
  margin-top: 1rem;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid #ef4444;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
}

.btn-remove-video:hover {
  background: #ef4444;
  color: white;
}
```

**File: admin-form/admin-form.js**

Add video upload logic:
- Add video file handler similar to photo upload
- Validate file size (max 50MB)
- Validate file type (MP4/WebM only)
- Upload to Supabase Storage `house-videos` bucket
- Store video URL in form data
- Generate thumbnail from video (using canvas)
- Include `video_url` and `video_thumbnail` in house creation/update

### Phase 3: Property Details - Video Player

**File: details/details.js**

Modify `renderPropertyDetails()` function to include video section:

After the photo gallery (around line 130), add:
```javascript
// Video Tour Section
let videoSection = '';
if (listing.video_url) {
  videoSection = `
    <div class="video-tour-section">
      <div class="video-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
        <h3>Video Tour</h3>
        <span class="video-badge">Verified</span>
      </div>
      <div class="video-player-wrapper">
        <video 
          id="property-video" 
          controls 
          preload="metadata"
          poster="${listing.video_thumbnail || ''}"
          style="width: 100%; border-radius: 16px; background: #000;"
        >
          <source src="${listing.video_url}" type="video/mp4">
          Your browser does not support video playback.
        </video>
      </div>
      <p class="video-description">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        This video was uploaded by the property owner to show the actual condition of the house.
      </p>
    </div>
  `;
}
```

**File: details/details.css**

Add video player styling:
```css
.video-tour-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--bg-panel);
  border-radius: 16px;
  border: 1px solid var(--card-border);
}

.video-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.video-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-main);
}

.video-badge {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: auto;
}

.video-player-wrapper {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.video-player-wrapper video {
  display: block;
  width: 100%;
}

.video-description {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(249, 115, 22, 0.1);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-muted);
}
```

### Phase 4: Browse Houses - Video Indicator

**File: shop/shop.js**

Modify `buildCardImageHTML()` to show video badge on listings with videos:

Add badge overlay when `listing.video_url` exists:
```javascript
const videoBadge = listing.video_url ? `
  <div class="video-badge-card">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" stroke="white" stroke-width="2"></rect>
    </svg>
    <span>Video Tour</span>
  </div>
` : '';
```

**File: shop/shop.css**

Add video badge styling for listing cards:
```css
.video-badge-card {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.video-badge-card svg {
  flex-shrink: 0;
}
```

### Phase 5: Data Layer Updates

**File: js/data.js**

Update queries to include video fields:

1. Modify `normalizeListing()` to include:
   - `video_url`
   - `video_thumbnail`

2. Update SELECT queries in `fetchAllData()` to include:
```javascript
.select("id, title, school, area, exactLocation, location, type, price, rooms, status, photo, photos, video_url, video_thumbnail, description, contact, amenities, views, created_at")
```

### Phase 6: Admin Dashboard - Video Indicator

**File: admin/admin.js**

Add video column/indicator in listings table to show which properties have videos.

**File: admin/admin.html**

Add "Video" column header in table.

## Key Features

1. **Video Upload**: Admins can upload MP4/WebM videos (max 50MB)
2. **Auto Thumbnail**: Generate thumbnail from video first frame
3. **Video Player**: Custom styled player with controls on property details
4. **Video Badge**: Visual indicator on browse cards showing "Video Tour" available
5. **Verified Badge**: Shows video was uploaded by property owner
6. **Lazy Loading**: Videos load on-demand, not preloaded
7. **Mobile Optimized**: Responsive video player

## Files Modified

1. `supabase-safe-migration.sql` - Add video storage bucket & columns
2. `admin-form/admin-form.html` - Add video upload UI
3. `admin-form/admin-form.css` - Video upload styling
4. `admin-form/admin-form.js` - Video upload logic
5. `details/details.js` - Video player rendering
6. `details/details.css` - Video player styling
7. `shop/shop.js` - Video badge on cards
8. `shop/shop.css` - Video badge styling
9. `js/data.js` - Include video fields in queries
10. `admin/admin.js` - Video indicator in dashboard
11. `admin/admin.html` - Video column in table

## Database Changes

```sql
-- New columns in houses table
video_url TEXT
video_thumbnail TEXT

-- New storage bucket
house-videos (public)
```

## Success Metrics

- Properties with videos get 3x more inquiries
- Students spend 2x longer on listings with videos
- Higher trust and conversion rates
- Reduced scam reports due to visual verification

## Next Steps After Implementation

1. Add video duration display
2. Add video quality selector (480p, 720p)
3. Add video walkthrough checklist (shows what's covered in video)
4. Add ability for students to request video updates
5. Add video analytics (views, watch time)
