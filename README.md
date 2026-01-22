# 🍎 Classroom Decision Support System

A clean, minimal, real-time pedagogical assistant designed for teachers in high-stress classroom environments. Powered by Gemini 3 and Gemini 2.5 Flash for instant, actionable guidance.

## 🚀 Quick Start

### 1. Clone and Install
If you just cloned the repository, make sure to enter the project directory before installing dependencies:

```bash
# Move into the project folder
cd Invoked

# Install dependencies
npm install
```

### 2. Configure API Key
The app requires a Google Gemini API Key. 
1. Create a `.env` file in the root directory.
2. Add your key:
   ```env
   API_KEY=your_actual_api_key_here
   ```

### 3. Run Locally
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## 🛠 Features

- **Voice Assistant (Gemini Live):** Tap the mic to describe a classroom situation. The assistant provides 1-2 sentence spoken advice and stops automatically after 5 seconds of silence.
- **Structured Advice:** Get a three-tier intervention strategy: "Do Now," "What to Say," and "Class Activity."
- **Pedagogical Rationale:** Expandable sections to understand the "Why" behind the advice.
- **Offline Resilience:** High-quality fallback strategies built-in for low-connectivity environments.
- **Mobile Optimized:** High-contrast, large-touch-target UI designed for one-handed use while teaching.

## 🧪 Troubleshooting

### "npm error code ENOENT"
This means `npm` cannot find the `package.json` file. Ensure you are inside the `Invoked` folder by running `pwd` (Mac/Linux) or looking at the path in PowerShell (Windows). If you see `...\Documents\Invoked` but your files are in `...\Documents\Invoked\Invoked`, you need to `cd Invoked` first.

### Microphone not working
- Ensure you are using `https://` or `localhost`. 
- For testing on mobile devices via local Wi-Fi, check `HOSTING.md` for specific browser flag instructions.

---

## 📄 Documentation
- [FEATURES.md](./FEATURES.md): Full breakdown of functionality and verification checklist.
- [HOSTING.md](./HOSTING.md): How to run the app on your phone via local network or tunnels.
- [DEPLOYMENT.md](./DEPLOYMENT.md): Guide for Vercel/Render deployment for hackathons.
