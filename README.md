# Mimori Digital — VIP Administration Suite & Experience Engine

> **Access URL**: `/` or `/admin`  
> **Login Gateway**: `/admin-login`  
> **Authorized Credentials**: User ID: `Mimori` | Password: `Demo123`  
> **Database Sync**: Supabase PostgreSQL + High-Performance In-Memory Cache Fallback  

---

## 🎛️ Overview

The **Mimori VIP Administration Suite** is a dedicated enterprise dashboard and content management engine for Mimori Digital's luxury experiential photobooth fleet.

This repository provides full control over:
1. **Fleet & Services Management**: Add, update, reorder, and configure luxury photo, video, and audio booths.
2. **Visual Service Detail Builder**: 9 customizable visual sections per booth (Hero, Metrics, Split Comparison, Client Journey, Lookbook Grid, Technical Specifications, Brochure PDF upload, Commission Packages, and Trust Bar).
3. **Menu & Hierarchy Organizer**: Organize live categories and assign booths into dynamic megamenu navigation with live drag/drop and database upserts.
4. **Enquiry Ledger**: Track client booking submissions, review dates, guest counts, budget tiers, and update booking status (`Confirmed`, `Contacted`, `Under Review`, `Cancelled`).
5. **Session-Protected Authentication**: Secure login gateway with token session cookies and instant sign-out.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (.env)
Create a `.env` file in the root directory:
```env
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3002
```

### 3. Run Locally
```bash
npm start
```
Open **[http://localhost:3002](http://localhost:3002)** in your browser.

---

## 🔐 Admin Authentication
- **User ID**: `Mimori`
- **Password**: `Demo123`
- Session cookie is valid for 24 hours with one-click sign out.

---

## ☁️ Deployment (Vercel)
This repository includes `vercel.json` configured with `@vercel/node` and automated bundling for immediate one-click deployment on Vercel.
