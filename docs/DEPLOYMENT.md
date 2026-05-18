# Deployment Guide - Legal Document Reviewer

## Deployment Architecture
- **Frontend**: GitHub Pages (auto-deployed from main branch)
- **Backend**: Render.com (free tier) or Railway.app
- **Database**: SQLite (can be upgraded to PostgreSQL)

---

## Quick Start: Deploy to GitHub + Render

### Phase 1: GitHub Setup (5 minutes)

1. **Create GitHub Repository**
   ```bash
   # Create new repo on github.com/new
   # Name: legal-doc-reviewer
   ```

2. **Push Code to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/legal-doc-reviewer.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repo Settings → Pages
   - Source: Deploy from a branch
   - Branch: gh-pages / root
   - Your frontend will be live at: `https://YOUR_USERNAME.github.io/legal-doc-reviewer/`

### Phase 2: Deploy Backend to Render (10 minutes)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → Web Service
   - Connect your GitHub repo
   - Set the following:
     - **Name**: legal-doc-reviewer-api
     - **Runtime**: Python 3.11
     - **Build Command**: `pip install -r backend/requirements.txt`
     - **Start Command**: `gunicorn backend.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker`
     - **Environment Variables** (Add these):
       ```
       OPENAI_API_KEY=your_api_key_here
       API_KEY=your_strong_random_secret_here
       CORS_ORIGINS=https://YOUR_USERNAME.github.io
       ```

3. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Your API will be at: `https://legal-doc-reviewer.onrender.com`

### Phase 3: Connect Frontend to Backend

1. **Update Frontend API URL**
   - The frontend config already points to: `https://legal-doc-reviewer.onrender.com`
   - No changes needed—it's already configured!

2. **Commit and Push**
   ```bash
   git add .
   git commit -m "Update API endpoint for production"
   git push origin main
   ```
   - GitHub Actions will automatically deploy your frontend

---

## Environment Variables Setup

### Backend (.env file)
```bash
cp .env.example .env
# Fill in your values:
# - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys
# - CORS_ORIGINS: Set to your frontend URL
```

### Important: Never commit .env
Already configured in `.gitignore`

---

## Testing Your Deployment

1. **Test Backend**
   ```bash
   curl https://legal-doc-reviewer-api.onrender.com/health
   ```

2. **Test Frontend**
   - Visit: `https://YOUR_USERNAME.github.io/legal-doc-reviewer/`
   - Try uploading a document

3. **Check Logs**
   - Render: Dashboard → legal-doc-reviewer-api → Logs tab
   - GitHub Actions: Repo → Actions tab

---

## Troubleshooting

### Backend won't start
- Check `OPENAI_API_KEY` is set correctly
- View Render logs for errors
- Verify Python version (3.11+)

### CORS errors
- Update `CORS_ORIGINS` in Render environment variables
- Include `https://` and `/` at the end of GitHub Pages URL

### Frontend can't reach backend
- Check API URL in `App.jsx`
- Verify backend is running (check Render status)
- Check browser console for error messages

---

## Upgrade Options

| Aspect | Free Tier | Paid |
|--------|-----------|------|
| Backend Host | Render (free) | AWS, Heroku |
| Database | SQLite | PostgreSQL, MySQL |
| Storage | 500MB limit | Unlimited |
| Uptime | 50 hours/month | 99.9% SLA |

---

## Next Steps

1. ✅ Push to GitHub
2. ✅ Deploy backend to Render
3. ✅ Deploy frontend to GitHub Pages
4. ⚠️ Test thoroughly
5. 🔄 Set up auto-deployments
6. 📊 Monitor logs and performance

For updates, just push to main branch—both will auto-deploy!
