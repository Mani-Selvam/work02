# cPanel Frontend Deployment Guide

This guide explains how to deploy the WorkLogix frontend to cPanel while keeping the backend on Render.

## Architecture

- **Frontend**: Hosted on cPanel (static files)
- **Backend**: Hosted on Render (https://worllogix-03.onrender.com)

## Prerequisites

1. Node.js 18+ installed on your local machine
2. cPanel access with File Manager or FTP
3. Backend already deployed and running on Render

## Step 1: Build the Frontend

Run this command to build the frontend with your Render backend URL:

```bash
# Replace with your actual Render backend URL
npm run build:cpanel
```

This creates a `dist/` folder with all the static files.

## Step 2: Upload to cPanel

### Option A: Using File Manager

1. Log in to cPanel
2. Open **File Manager**
3. Navigate to `public_html/` (or your subdomain folder)
4. Delete existing files (if updating)
5. Upload all contents from your local `dist/` folder:
   - `index.html`
   - `assets/` folder
   - `.htaccess` file

### Option B: Using FTP

1. Connect to your cPanel via FTP (FileZilla, etc.)
2. Navigate to `public_html/`
3. Upload all contents from `dist/` folder

## Step 3: Configure .htaccess

The `.htaccess` file is included in the build and handles:
- SPA routing (all routes serve index.html)
- Security headers
- GZIP compression
- Static asset caching

Make sure the `.htaccess` file is uploaded to `public_html/`.

## Step 4: Configure CORS on Render Backend

Your Render backend must allow requests from your cPanel domain. Add this environment variable in Render:

**In Render Dashboard > Your Service > Environment:**

```
ALLOWED_ORIGINS=https://your-cpanel-domain.com,https://www.your-cpanel-domain.com
```

Replace `your-cpanel-domain.com` with your actual cPanel domain.

The backend is already configured to read this environment variable and allow cross-origin requests.

## Troubleshooting

### API calls failing?
- Check browser console for CORS errors
- Verify VITE_API_URL was set correctly during build
- Ensure Render backend CORS allows your cPanel domain

### Page refresh shows 404?
- Make sure `.htaccess` file is uploaded
- Check that mod_rewrite is enabled on your cPanel

### Login/session issues?
- Ensure `credentials: true` is set in both frontend fetch calls and backend CORS
- Check that cookies are being set with proper SameSite and Secure attributes

## Updating the Frontend

To update after code changes:

1. Run the build command again:
   ```bash
   VITE_API_URL=https://worllogix-03.onrender.com npm run build:cpanel
   ```

2. Upload the new `dist/` contents to cPanel (replace old files)

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Your Render backend URL | https://worllogix-03.onrender.com |

## Notes

- Environment variables in Vite are "baked in" at build time
- You must rebuild the frontend if the backend URL changes
- The `.htaccess` file is essential for SPA routing on Apache servers
