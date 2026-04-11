# SplitMate — Expense Splitting Web App
### Web Technology Assignment Project

---

## 📁 Project Structure

```
splitmate/
├── frontend/               # Static HTML/CSS/JS frontend
│   ├── index.html          # Landing page
│   ├── login.html          # Login page
│   ├── register.html       # Register page
│   ├── dashboard.html      # Main dashboard (groups list)
│   ├── group.html          # Group detail (expenses, balances, members)
│   ├── style.css           # All styles
│   ├── config.js           # API base URL config ← EDIT THIS
│   ├── api.js              # Fetch wrapper
│   └── app.js              # Shared utilities (auth, logout)
│
├── backend/                # Node.js + Express + MongoDB API
│   ├── server.js           # Entry point
│   ├── models/
│   │   ├── User.js         # User schema
│   │   ├── Group.js        # Group schema
│   │   └── Expense.js      # Expense schema
│   ├── routes/
│   │   ├── auth.js         # /api/auth/*
│   │   ├── groups.js       # /api/groups/*
│   │   └── expenses.js     # /api/expenses/*
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── .env.example        # Copy to .env and fill values
│   └── package.json
│
├── render.yaml             # Backend deploy config (Render.com)
├── netlify.toml            # Frontend deploy config (Netlify)
└── README.md
```

---

## 🚀 Local Development Setup

### 1. Clone & set up backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your MongoDB URI and JWT secret
npm run dev        # starts on http://localhost:5000
```

### 2. Set frontend API URL

Open `frontend/config.js` and set:
```js
const CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api'
};
```

### 3. Open frontend

Open `frontend/index.html` in your browser, or use VS Code Live Server.

---

## 🌐 Deployment Guide

### Step 1: MongoDB Atlas (Database)

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free account
2. Create a **Free M0 cluster** (Singapore region)
3. Create a **database user** (username + password)
4. Under Network Access → Add IP → `0.0.0.0/0` (allow all)
5. Get connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/splitmate
   ```

---

### Step 2: Deploy Backend to Render.com

1. Go to [render.com](https://render.com) → Sign up free
2. New → **Web Service** → Connect your GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
4. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | Your Atlas connection string |
   | `JWT_SECRET` | Any long random string |
   | `FRONTEND_URL` | Your Netlify URL (add after Step 3) |
   | `NODE_ENV` | `production` |
5. Deploy → Your API URL: `https://splitmate-backend.onrender.com`

---

### Step 3: Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → Sign up free
2. **New site** → Drag & drop the `frontend/` folder

   **OR** connect GitHub and set:
   - **Publish directory**: `frontend`
   - No build command needed

3. **Before deploying**, edit `frontend/config.js`:
   ```js
   const CONFIG = {
     API_BASE_URL: 'https://splitmate-backend.onrender.com/api'
   };
   ```
4. Your site is live at: `https://splitmate-xyz.netlify.app`

---

### Step 4: Update CORS on Backend

Go back to Render → Environment Variables → update:
```
FRONTEND_URL = https://splitmate-xyz.netlify.app
```

Render will auto-redeploy.

---

## 🔑 Demo Credentials (for presentation)

After deploying, register via the app. For demo purposes:
- **Email**: demo@splitmate.com
- **Password**: demo123

Register this account once, then the login page has a "Fill demo credentials" button.

---

## 📡 API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET  | `/api/auth/me` | ✅ | Get current user |
| GET  | `/api/groups` | ✅ | Get all my groups |
| POST | `/api/groups` | ✅ | Create group |
| GET  | `/api/groups/:id` | ✅ | Get group detail |
| POST | `/api/groups/join/:code` | ✅ | Join via invite code |
| POST | `/api/groups/:id/invite` | ✅ | Add member by email |
| GET  | `/api/groups/:id/balances` | ✅ | Get balances & settlements |
| GET  | `/api/expenses/group/:id` | ✅ | List expenses in group |
| POST | `/api/expenses` | ✅ | Add expense |
| DELETE | `/api/expenses/:id` | ✅ | Delete expense |
| GET  | `/api/expenses/summary/:id` | ✅ | Expense summary |
| GET  | `/api/health` | ❌ | Health check |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| Hosting (FE) | Netlify (free) |
| Hosting (BE) | Render.com (free) |
| DB Hosting | MongoDB Atlas (free) |

---

## ✨ Features

- **User auth** — Register, login, JWT-based sessions
- **Groups** — Create groups by category (trip, home, food, event)
- **Invite system** — Share 8-character invite codes; add members by email
- **Expenses** — Add expenses with title, amount, category, notes; auto equal-split
- **Smart balances** — Debt simplification algorithm (minimizes transactions)
- **Settlements** — See exactly who pays whom and how much
- **Delete expenses** — Creators can remove their expenses
- **Responsive** — Works on mobile and desktop
- **Dashboard** — Overview of all groups, owed/owing totals
