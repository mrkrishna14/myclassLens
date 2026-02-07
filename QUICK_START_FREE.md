# 🚀 Quick Start - ClassLens (100% FREE)

Get ClassLens running in 5 minutes with completely free APIs!

## ⚡ Super Quick Setup

### 1. Get Your Free API Keys (2 minutes)

**Groq (AI Explanations):**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (no credit card needed)
3. Click "API Keys" → "Create API Key"
4. Copy your key (starts with `gsk_`)

**AssemblyAI (Transcription):**
1. Go to [assemblyai.com](https://www.assemblyai.com)
2. Sign up (no credit card needed)
3. Copy your API key from the dashboard

### 2. Install Dependencies (1 minute)

```bash
cd frontend
npm install
```

### 3. Configure API Keys (1 minute)

Create `frontend/.env.local` file:

```bash
cd frontend
touch .env.local
```

Add your keys to `.env.local`:

```env
GROQ_API_KEY=gsk_your_groq_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
```

### 4. Start the App (30 seconds)

```bash
npm run dev
```

### 5. Test It! (1 minute)

1. Open [http://localhost:3000](http://localhost:3000)
2. Upload a short test video
3. Wait for transcription
4. Ask a question about the video!

---

## ✅ That's It!

**Total Cost: $0**  
**Total Time: ~5 minutes**  
**Credit Card Required: NO**

For detailed instructions, see [GROQ_SETUP.md](./GROQ_SETUP.md)

---

## 🆘 Troubleshooting

**"Cannot find module 'groq-sdk'"**
```bash
cd frontend
npm install
```

**"API key not defined"**
- Check `.env.local` is in `frontend/` directory
- Restart dev server after editing `.env.local`

**Transcription fails**
- Verify AssemblyAI key is correct
- Check you haven't exceeded 5 hours/month free tier

---

## 📊 What You Get (FREE)

- ✅ **5 hours/month** of transcription (AssemblyAI)
- ✅ **30 requests/minute** for AI explanations (Groq)
- ✅ **No credit card** required
- ✅ **No expiration** on free tier

Perfect for students and testing! 🎓
