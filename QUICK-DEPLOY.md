# 🚀 Quick Deployment Guide

## Option 1: Deploy on Free Tier (Recommended for Start)

### Prerequisites
```bash
# Install Vercel CLI
npm i -g vercel

# Install Git (if not already)
# Download from git-scm.com
```

---

## Step-by-Step Deployment

### 1️⃣ Prepare Your Code

```bash
# Create .gitignore if not exists
echo "node_modules/" > .gitignore
echo "dist/" >> .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore

# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Create GitHub repo and push
# Go to github.com, create new repo, then:
git remote add origin https://github.com/yourusername/youtube-downloader.git
git branch -M main
git push -u origin main
```

### 2️⃣ Deploy Frontend (Vercel)

```bash
cd frontend

# Install dependencies
npm install

# Test build locally
npm run build

# Deploy to Vercel
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? Your account
# - Link to existing project? N
# - Project name? youtube-downloader
# - Directory? ./
# - Override settings? N

# Get your production URL (e.g., https://youtube-downloader.vercel.app)
vercel --prod
```

**Configure Angular for Vercel:**
Create `frontend/vercel.json`:
```json
{
  "version": 2,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

### 3️⃣ Deploy Backend (Render.com)

1. **Push your code to GitHub** (already done above)

2. **Go to Render.com:**
   - Sign up at https://render.com (free account)
   - Click "New +"
   - Select "Web Service"

3. **Connect Repository:**
   - Connect your GitHub account
   - Select your repository
   - Choose branch: `main`

4. **Configure Service:**
   ```
   Name: youtube-downloader-backend
   Region: Select closest to your users
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm run start:prod
   ```

5. **Add Environment Variables:**
   Click "Environment" tab and add:
   ```
   PORT=3000
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend.vercel.app
   RATE_LIMIT_TTL=60
   RATE_LIMIT_MAX=10
   ```

6. **Deploy:**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - Note your backend URL: `https://your-app.onrender.com`

### 4️⃣ Connect Frontend to Backend

Update your Angular environment file:

**frontend/src/environments/environment.prod.ts:**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend.onrender.com/api'
};
```

**Redeploy frontend:**
```bash
cd frontend
vercel --prod
```

### 5️⃣ Configure Custom Domain (Optional)

**Buy domain from:**
- Namecheap ($10/year)
- GoDaddy ($12/year)
- Cloudflare ($9/year)

**Configure DNS:**

**For Frontend (Vercel):**
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain: `yourdomain.com`
3. Add DNS records at your domain registrar:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

**For Backend (Render):**
1. Go to Render Dashboard → Your Service → Settings → Custom Domain
2. Add subdomain: `api.yourdomain.com`
3. Add DNS record:
   ```
   Type: CNAME
   Name: api
   Value: your-app.onrender.com
   ```

### 6️⃣ Setup Analytics (Free)

**Google Analytics:**
1. Go to analytics.google.com
2. Create new property
3. Get tracking ID
4. Add to `frontend/src/index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 7️⃣ Setup Google Search Console

1. Go to search.google.com/search-console
2. Add property (your domain)
3. Verify ownership:
   - Download HTML verification file
   - Upload to `frontend/src/` folder
   - Redeploy
4. Submit sitemap: `https://yourdomain.com/sitemap.xml`

---

## Monitoring & Maintenance

### Check Backend Status
```bash
# View logs on Render
# Go to Dashboard → Your Service → Logs
```

### Check Frontend Status
```bash
# View logs on Vercel
vercel logs https://your-project.vercel.app
```

### Update Deployment

**Frontend:**
```bash
cd frontend
git add .
git commit -m "Update feature"
git push origin main
# Auto-deploys via Vercel GitHub integration
```

**Backend:**
```bash
cd backend
git add .
git commit -m "Fix backend issue"
git push origin main
# Auto-deploys via Render GitHub integration
```

---

## Cost Summary

### Free Tier Limits:
**Vercel:**
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Custom domain

**Render:**
- ✅ 750 hours/month (enough for 1 service)
- ⚠️ Sleeps after 15 min inactivity (free tier)
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS

**Upgrade Triggers:**
- Render Starter ($7/month): No sleep, dedicated resources
- Vercel Pro ($20/month): More bandwidth, better support

---

## Troubleshooting

### Frontend not loading
```bash
# Check build output
cd frontend
npm run build
# Look for errors
```

### Backend CORS error
Update `backend/src/main.ts`:
```typescript
app.enableCors({
  origin: ['https://your-frontend.vercel.app', 'https://yourdomain.com'],
  credentials: true
});
```

### Backend sleeping (Render free tier)
**Solutions:**
1. Upgrade to $7/month paid plan
2. Use UptimeRobot (free) to ping every 5 minutes
3. Deploy to alternative (Railway, Fly.io)

---

## Next Steps After Deployment

1. ✅ Test all features on production
2. ✅ Setup error monitoring (Sentry - free tier)
3. ✅ Add Google Analytics
4. ✅ Submit to Google Search Console
5. ✅ Create social media accounts
6. ✅ Launch on Product Hunt
7. ✅ Start content marketing (blog posts)

---

**Estimated Time:** 1-2 hours for first-time deployment

**Need Help?** Check detailed guide in `DEPLOYMENT-SEO-STRATEGY.md`
