# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up OpenAI API Key

**You MUST do this before running the app!**

1. Get your API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create the environment file:
   ```bash
   cd frontend
   echo "OPENAI_API_KEY=your_key_here" > .env.local
   ```
3. Replace `your_key_here` with your actual key

**📖 For detailed instructions, see [OPENAI_SETUP.md](./OPENAI_SETUP.md)**

### 3. Run the App
```bash
npm run dev
```

### 4. Open Browser
Go to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
classLens/
├── frontend/           # All frontend code is here
│   ├── app/           # Next.js app
│   ├── components/    # React components
│   └── .env.local     # Your API key goes here
├── OPENAI_SETUP.md    # Detailed API setup guide
└── README.md          # Full documentation
```

---

## ⚠️ Common Issues

**"OPENAI_API_KEY is not defined"**
- Make sure `.env.local` is in the `frontend/` directory
- Restart the dev server after creating the file

**"Insufficient quota"**
- Add credits to your OpenAI account
- See [OPENAI_SETUP.md](./OPENAI_SETUP.md) Step 2

---

## 📚 Next Steps

- Read [OPENAI_SETUP.md](./OPENAI_SETUP.md) for complete API setup
- Read [README.md](./README.md) for full documentation
- Read [BUILD_EXPLANATION.md](./BUILD_EXPLANATION.md) for technical details
