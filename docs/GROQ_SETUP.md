# Groq + AssemblyAI Setup Guide (100% FREE)

This guide explains how to set up ClassLens with **completely free APIs** instead of OpenAI.

## 🎉 What Changed

ClassLens now uses:
- **Groq** (Llama 3.2 Vision) - For AI explanations → **FREE**
- **AssemblyAI** - For transcription → **FREE** (5 hours/month)

## 🆓 Cost Comparison

| Service | OpenAI | Groq + AssemblyAI |
|---------|--------|-------------------|
| **AI Explanations** | $0.01-0.02/question | **FREE** |
| **Transcription** | $0.006/minute | **FREE** (5 hrs/month) |
| **Monthly Cost** | $4-5 | **$0** |

---

## 🔑 Step 1: Get Groq API Key (FREE)

### 1.1 Create Groq Account
1. Go to [https://console.groq.com](https://console.groq.com)
2. Click **"Sign Up"** (free, no credit card required)
3. Verify your email

### 1.2 Generate API Key
1. Once logged in, go to **"API Keys"** in the sidebar
2. Click **"Create API Key"**
3. Give it a name (e.g., "ClassLens")
4. **Copy the key** - it will look like: `gsk_...`

⚠️ **IMPORTANT**: Keep this key secret!

### 1.3 Rate Limits (FREE Tier)
- **30 requests/minute** for Llama 3.2 90B Vision
- **14,400 tokens/minute**
- More than enough for ClassLens usage!

---

## 🎙️ Step 2: Get AssemblyAI API Key (FREE)

### 2.1 Create AssemblyAI Account
1. Go to [https://www.assemblyai.com](https://www.assemblyai.com)
2. Click **"Get Started Free"** (no credit card required)
3. Sign up with email

### 2.2 Get API Key
1. After login, you'll see your dashboard
2. Your API key is displayed at the top
3. **Copy the key** - it will look like: `abc123...`

### 2.3 Free Tier Limits
- **5 hours of transcription per month** - FREE
- Perfect for testing and moderate usage
- That's ~5 one-hour lectures per month!

---

## ⚙️ Step 3: Configure Your API Keys

### 3.1 Create Environment File

Navigate to the `frontend/` directory:
```bash
cd frontend
```

Create a `.env.local` file:
```bash
touch .env.local
```

### 3.2 Add Your API Keys

Open `.env.local` in a text editor and add:

```env
GROQ_API_KEY=gsk_your_groq_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
```

**Replace the placeholder values with your actual API keys**

### 3.3 Verify the File

Your `.env.local` file should look like this (with your real keys):
```env
GROQ_API_KEY=gsk_abc123def456ghi789
ASSEMBLYAI_API_KEY=xyz789abc123def456
```

**Important Notes:**
- ✅ No quotes around the keys
- ✅ No spaces before or after the `=`
- ✅ The file is named exactly `.env.local` (starts with a dot)
- ✅ The file is in the `frontend/` directory

---

## 📦 Step 4: Install Dependencies

From the `frontend/` directory:

```bash
npm install
```

This will install:
- `groq-sdk` - Groq API client
- `assemblyai` - AssemblyAI API client

---

## 🚀 Step 5: Start the Application

### 5.1 Start Development Server

```bash
npm run dev
```

### 5.2 Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. Upload a short test video (1-2 minutes)
3. Wait for transcription to complete (may take 30-60 seconds)
4. Try asking a question about a part of the video

---

## 🧪 Testing Your Setup

### Test Checklist:
- [ ] Video uploads successfully
- [ ] Transcription completes (check browser console for progress)
- [ ] Captions appear as video plays
- [ ] Can draw bounding box on video
- [ ] Can ask questions about selected area
- [ ] AI explanation appears

### Common Errors:

**Error: "GROQ_API_KEY is not defined"**
- ✅ Check that `.env.local` exists in `frontend/` directory
- ✅ Verify the key is correct (starts with `gsk_`)
- ✅ Restart the dev server after creating/editing `.env.local`

**Error: "ASSEMBLYAI_API_KEY is not defined"**
- ✅ Check that `.env.local` has both keys
- ✅ Verify you copied the entire key
- ✅ Restart the dev server

**Error: "Rate limit exceeded"**
- ✅ Wait a minute and try again
- ✅ Groq has 30 requests/minute limit (very generous)

**Transcription is slow:**
- ✅ This is normal - AssemblyAI processes the entire video
- ✅ A 5-minute video takes ~30-60 seconds to transcribe
- ✅ Check browser console for progress updates

---

## 📊 API Capabilities

### Groq (Llama 3.2 Vision)
- **Model**: `llama-3.2-90b-vision-preview`
- **Capabilities**: 
  - Image understanding
  - Text generation
  - Multi-language support
  - Educational explanations
- **Speed**: 🚀 Much faster than OpenAI
- **Quality**: Excellent for educational content

### AssemblyAI
- **Capabilities**:
  - Audio/video transcription
  - Automatic punctuation
  - Word-level timestamps
  - Multi-language support
- **Accuracy**: Very high (comparable to Whisper)
- **Speed**: 30-60 seconds for 5-minute video

---

## 🔒 Security Best Practices

### ✅ DO:
- Store API keys in `.env.local` (already in `.gitignore`)
- Keep keys secret
- Rotate keys if exposed

### ❌ DON'T:
- Commit `.env.local` to git (it's already ignored)
- Share your API keys publicly
- Hardcode keys in source code

---

## 💡 Usage Tips

### Optimize Transcription:
- Upload shorter videos for faster processing
- AssemblyAI free tier: 5 hours/month
- Monitor usage at [assemblyai.com/dashboard](https://www.assemblyai.com/dashboard)

### Optimize AI Explanations:
- Ask specific questions for better answers
- Groq rate limit: 30 requests/minute
- Draw precise bounding boxes for better context

### Monitor Usage:
- **Groq**: Check usage at [console.groq.com](https://console.groq.com)
- **AssemblyAI**: Check usage at [assemblyai.com/dashboard](https://www.assemblyai.com/dashboard)

---

## 🆚 Groq vs OpenAI Comparison

| Feature | OpenAI | Groq |
|---------|--------|------|
| **Cost** | $4-5/month | **FREE** |
| **Speed** | Moderate | 🚀 **Much Faster** |
| **Vision Quality** | Excellent | Excellent |
| **Rate Limits** | Paid tiers | 30 req/min (free) |
| **Setup** | Credit card required | **No credit card** |

---

## 🛠️ Troubleshooting

### Problem: "Cannot find module 'groq-sdk'"

**Solution:**
```bash
cd frontend
npm install
```

### Problem: Transcription fails

**Solution:**
1. Check AssemblyAI API key is correct
2. Verify you haven't exceeded 5 hours/month
3. Check browser console for detailed error
4. Try a shorter video first

### Problem: AI explanations not working

**Solution:**
1. Verify Groq API key is correct
2. Check you haven't hit rate limit (30 req/min)
3. Try asking a simpler question
4. Check browser console for errors

### Problem: Video won't upload

**Solution:**
1. Check file format (MP4, MOV supported)
2. Try a smaller video file
3. Check browser console for errors

---

## 📚 API Documentation

- **Groq API**: [https://console.groq.com/docs](https://console.groq.com/docs)
- **AssemblyAI API**: [https://www.assemblyai.com/docs](https://www.assemblyai.com/docs)
- **Llama 3.2 Vision**: [https://www.llama.com](https://www.llama.com)

---

## ✅ Quick Setup Checklist

- [ ] Created Groq account (free)
- [ ] Got Groq API key
- [ ] Created AssemblyAI account (free)
- [ ] Got AssemblyAI API key
- [ ] Created `frontend/.env.local` file
- [ ] Added both API keys to `.env.local`
- [ ] Ran `npm install` in `frontend/`
- [ ] Started dev server (`npm run dev`)
- [ ] Tested with a short video
- [ ] Verified transcription works
- [ ] Verified AI explanations work

---

## 🎯 Summary

**What you need:**
1. Groq account + API key (FREE, no credit card)
2. AssemblyAI account + API key (FREE, 5 hrs/month)
3. `.env.local` file in `frontend/` directory with both keys

**Which APIs:**
- **Groq** (Llama 3.2 Vision) - AI explanations
- **AssemblyAI** - Video transcription

**Total cost:**
- **$0/month** for moderate usage
- No credit card required
- Perfect for students and testing

**Next steps:**
1. Get your API keys (5 minutes)
2. Add them to `.env.local`
3. Run `npm install` and `npm run dev`
4. Start learning with ClassLens! 🎓

---

## 🚀 Advantages of This Setup

✅ **100% Free** - No credit card needed  
✅ **Fast** - Groq is incredibly fast  
✅ **Easy Setup** - Just 2 API keys  
✅ **No Usage Anxiety** - Free tier is generous  
✅ **Great Quality** - Llama 3.2 Vision is excellent  
✅ **Perfect for Students** - No financial barrier  

That's it! Enjoy using ClassLens completely free! 🎉
