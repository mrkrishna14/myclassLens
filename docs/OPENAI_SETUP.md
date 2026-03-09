# OpenAI API Setup Guide

This guide explains exactly what you need to do to set up the OpenAI API for ClassLens.

## 📋 Overview

ClassLens uses **two OpenAI APIs**:
1. **Whisper API** - For transcribing video audio to text
2. **GPT-4o API** - For generating AI explanations of selected video regions

---

## 🔑 Step 1: Get Your OpenAI API Key

### 1.1 Create an OpenAI Account
1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Click **"Sign Up"** or **"Log In"** if you already have an account
3. Complete the registration process

### 1.2 Generate an API Key
1. Once logged in, click on your **profile icon** (top right)
2. Select **"API Keys"** from the dropdown menu
3. Click **"+ Create new secret key"**
4. Give it a name (e.g., "ClassLens")
5. **Copy the key immediately** - you won't be able to see it again!
   - It will look like: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **IMPORTANT**: Keep this key secret! Never commit it to git or share it publicly.

---

## 💰 Step 2: Add Credits to Your Account

OpenAI APIs are **pay-as-you-go**. You need to add credits before using the APIs.

### 2.1 Add Payment Method
1. Go to [https://platform.openai.com/account/billing](https://platform.openai.com/account/billing)
2. Click **"Add payment method"**
3. Enter your credit card information
4. Set up a usage limit (recommended: $10-20 for testing)

### 2.2 Pricing Information

**Whisper API (Transcription):**
- **$0.006 per minute** of audio/video
- Example: A 60-minute lecture = $0.36

**GPT-4o API (Vision/Explanations):**
- **$0.005 per 1K input tokens** (text + image)
- **$0.015 per 1K output tokens** (response)
- Example: One question with image ≈ $0.01-0.02

**Estimated Monthly Cost:**
- 10 lectures (60 min each) = ~$3.60 for transcription
- 50 questions = ~$0.50-1.00 for explanations
- **Total: ~$4-5/month for moderate usage**

---

## ⚙️ Step 3: Configure Your API Key

### 3.1 Create Environment File

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Create a `.env.local` file:
   ```bash
   touch .env.local
   ```

   Or on Windows:
   ```cmd
   type nul > .env.local
   ```

### 3.2 Add Your API Key

Open `.env.local` in a text editor and add:

```env
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

**Replace `sk-proj-your-actual-api-key-here` with your actual API key from Step 1.2**

### 3.3 Verify the File

Your `.env.local` file should look exactly like this (with your real key):
```env
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**Important Notes:**
- ✅ No quotes around the key
- ✅ No spaces before or after the `=`
- ✅ The file is named exactly `.env.local` (starts with a dot)
- ✅ The file is in the `frontend/` directory

---

## 🧪 Step 4: Test Your Setup

### 4.1 Install Dependencies

From the `frontend/` directory:
```bash
npm install
```

### 4.2 Start the Development Server

```bash
npm run dev
```

### 4.3 Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. Upload a short test video (1-2 minutes)
3. Wait for transcription to complete
4. Try asking a question about a part of the video

### 4.4 Check for Errors

If you see errors in the console:

**Error: "OPENAI_API_KEY is not defined"**
- ✅ Check that `.env.local` exists in `frontend/` directory
- ✅ Verify the key is correct (no quotes, no spaces)
- ✅ Restart the dev server after creating/editing `.env.local`

**Error: "Insufficient quota"**
- ✅ Add credits to your OpenAI account (Step 2)

**Error: "Invalid API key"**
- ✅ Verify you copied the entire key correctly
- ✅ Check for any extra spaces or characters
- ✅ Generate a new key if needed

---

## 📊 Step 5: Monitor Usage

### 5.1 Check API Usage

1. Go to [https://platform.openai.com/usage](https://platform.openai.com/usage)
2. View your usage statistics
3. Set up usage alerts if desired

### 5.2 Set Usage Limits

1. Go to [https://platform.openai.com/account/limits](https://platform.openai.com/account/limits)
2. Set hard limits to prevent unexpected charges
3. Recommended: $10-20 for initial testing

---

## 🔒 Security Best Practices

### ✅ DO:
- Store API key in `.env.local` (already in `.gitignore`)
- Use environment variables in production
- Rotate keys periodically
- Set usage limits

### ❌ DON'T:
- Commit `.env.local` to git (it's already ignored)
- Share your API key publicly
- Hardcode the key in source code
- Use the same key for multiple projects

---

## 🛠️ Troubleshooting

### Problem: API calls are failing

**Solution:**
1. Verify your API key is correct
2. Check your account has credits
3. Ensure `.env.local` is in the `frontend/` directory
4. Restart the dev server after changing `.env.local`

### Problem: Transcription is slow

**Solution:**
- This is normal for long videos
- Whisper processes the entire video upfront
- Consider adding a loading indicator (already implemented)

### Problem: Getting rate limit errors

**Solution:**
- You may have hit OpenAI's rate limits
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan

### Problem: High costs

**Solution:**
- Set usage limits in OpenAI dashboard
- Monitor usage regularly
- Consider caching transcriptions
- Optimize image sizes before sending to GPT-4o

---

## 📚 API Documentation Reference

- **Whisper API**: [https://platform.openai.com/docs/guides/speech-to-text](https://platform.openai.com/docs/guides/speech-to-text)
- **GPT-4o Vision**: [https://platform.openai.com/docs/guides/vision](https://platform.openai.com/docs/guides/vision)
- **OpenAI Node.js SDK**: [https://github.com/openai/openai-node](https://github.com/openai/openai-node)

---

## ✅ Quick Checklist

- [ ] Created OpenAI account
- [ ] Generated API key
- [ ] Added payment method and credits
- [ ] Created `frontend/.env.local` file
- [ ] Added `OPENAI_API_KEY=your-key` to `.env.local`
- [ ] Installed dependencies (`npm install` in `frontend/`)
- [ ] Started dev server (`npm run dev` in `frontend/`)
- [ ] Tested with a short video
- [ ] Verified transcription works
- [ ] Verified AI explanations work

---

## 🎯 Summary

**What you need:**
1. OpenAI account with API key
2. Credits added to account (~$5-10 for testing)
3. `.env.local` file in `frontend/` directory with your API key

**Which APIs:**
- **Whisper API** (automatic - transcribes videos)
- **GPT-4o API** (automatic - generates explanations)

**Where to configure:**
- `frontend/.env.local` file

**How to test:**
- Run `npm run dev` in `frontend/` directory
- Upload a test video
- Check browser console for any errors

That's it! Once your API key is set up, ClassLens will automatically use it for all AI features.
