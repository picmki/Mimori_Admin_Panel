# Mimori Digital — Client-Facing Website & Backend (White Theme)

> **Brand Primary**: `#E31D1C`  
> **Theme**: Modern White Editorial & Clean Layout inspired by **[Bilimbe.in](https://www.bilimbe.in)**  
> **Typography**: `Avenir`, `Avenir Next`, with modern geometric sans-serif fallbacks  
> **Platform**: Full-Stack Node.js Web Application (Client-Facing Website & Backend REST API)

---

## 📸 Overview

**Mimori Digital** is a client-facing digital experience website for a premier photobooth and event entertainment service company. The website has been redesigned into an ultra-clean **White Theme** featuring the layout, section structure, and visual flow of **Bilimbe.in**, while preserving Mimori Digital's signature `#E31D1C` brand color and `Avenir` typography.

---

## 🎨 Bilimbe-Inspired White Theme Layout Structure

1. **Clean White Header**:
   - Crisp white background with subtle border divider (`#E5E7EB`).
   - Brand logo mark with `#E31D1C` lens accent.
   - Centered navigation links: *Home*, *Products & Booths*, *Showcase*, *About Us*, *Branches*, *Testimonials*, *FAQ*.
   - Right action buttons: Red Call Pill (`📞 +44 20 7946 0912`) and `Contact us` button.
2. **Hero Carousel Banner**:
   - Full-width hero slider with editorial headings, highlighted red keywords, and dual conversion CTAs (*Book a Glambot Demo*, *Explore Products*).
   - Interactive live 4K viewfinder preview card with real-time strobe flash simulation (`⚡ Test Strobe Flash`) and filter switches.
3. **Signature Product Showcase Rows (Bilimbe 2-Row Alternating Pattern)**:
   - **Row 1**: *Event Registration with QR Code* (Media mockup with live contactless QR check-in on the left, copy + red `Get Quote →` button on the right).
   - **Row 2**: *Own the Spotlight with Glambot Video Booth* (Copy + red `Book a Glambot Demo →` button on the left, cinematic 360° motorized camera mockup on the right).
4. **About Us Section**:
   - Headline: *Capture Emotion, Build Bonds, Celebrate Every Instant.*
   - Subhead: *From hello to highlight — capture the magic in every moment!*
   - Clean 2-column feature blocks highlighting AI Sketch & Kardashian Glam, Smooth Setup Promise, Full-Frame Canon optics, and 100% equipment redundancy.
5. **Services Section with Bilimbe's Interactive Accordion + Dynamic Preview**:
   - Left side: Accordion of all 6 booth experiences (*The Signature Studio Photobooth*, *360° Cinematic Video Booth*, *The B&W Kardashian Glam Booth*, *Vintage Audio Guestbook*, *Corporate Activations*, *Custom Themed Builds*).
   - Right side: Dynamic Live Preview Card that updates automatically with badge, title, specs, pricing, and a one-click enquiry pre-selection button.
   - **Bilimbe Red Counter Strip**: `4+ Years of Excellence` | `150+ Brands Worked` | `450+ Events Catered` | `120k+ Moments Printed` | `25+ Cities Worldwide`.
6. **Our Reach / Branches Section (Bilimbe Style)**:
   - Headline: *The Smart Choice for Organisers in Your City*.
   - Responsive grid of location cards with floating pill action buttons (*London Mayfair*, *Oxfordshire & Cotswolds*, *Berkshire & Surrey*, *Manchester & Cheshire*, *Lake Como & Italy*, *Dubai & UAE*).
7. **Testimonials Dual-Row Infinite Marquee**:
   - Row 1: Scrolling left with authentic reviews from couples and summit coordinators.
   - Row 2: Scrolling right with luxury pop-up and gala reviews.
8. **Client Brands Marquee**:
   - Smooth continuous brand marquee with left/right gradient blur masks (*British Vogue, Red Bull Racing, Soho House, Chanel, The Dorchester, TechCrunch*).
9. **Get in Touch / Let's Work Together & Booking Section (Bilimbe Split Form)**:
   - Left side: "Let's Work Together" card with email, telephone, London Mayfair address, and vector coverage map.
   - Right side: Clean white form box matching Bilimbe's layout with split inputs (Name, Email), Phone number, Product dropdown, Venue & City dropdown, Date picker, Message textarea, and red `Submit Event Enquiry` button.
   - **Section 12 Confirmation State**: Displays generated booking reference (`MIM-XXXXX`), timeline, recap, and **Add Event Reminder (.ics)** calendar download.
   - Real-time Enquiry Status Tracker tool.
10. **FAQ 2-Column Accordion**:
    - Clean white cards with red plus/minus toggle icons.
11. **Footer**:
    - Top banner: *"Ready to achieve your best? Let's get you started"* + red CTA button.
    - Categorized link columns (Photo Booths, Video Booths, Coverage, Tech).
    - Copyright and legal links.

---

## 🚀 Backend REST API (`server.js`)

Zero external dependencies. Native Node.js HTTP server:
- `GET /api/health` — System status.
- `GET /api/services` — Full 6-product catalog and pricing.
- `GET /api/portfolio` — Curated activations.
- `GET /api/testimonials` — Verified client reviews.
- `POST /api/enquiries` — Validates booking enquiry, generates `MIM-XXXXX` reference, and persists in `data/enquiries.json`.
- `GET /api/enquiries/:referenceId` — Sanitized live status check by reference code.

---

## 🛠️ How to Run

```bash
# In the project directory
npm start
# or
node server.js
```

Runs at:
👉 **`http://localhost:3000`** (or `http://127.0.0.1:3000`)
