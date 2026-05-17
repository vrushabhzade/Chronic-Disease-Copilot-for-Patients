<div align="center">

# 🩺 Chronic Disease Copilot

**An intelligent, privacy-first AI health assistant designed for chronic condition management.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20AI-orange.svg)](https://ollama.ai/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS-black.svg)](https://elevenlabs.io/)

[Features](#-key-features) • [Architecture](#-technology-stack) • [Installation](#-getting-started) • [Usage](#-usage-guide) • [Contributing](#-contributing)

</div>

---

## 📖 About the Project

Managing a chronic disease requires continuous monitoring, which can be overwhelming. The **Chronic Disease Copilot** is a 24/7 personal health companion built to alleviate this burden. 

It seamlessly blends **ElevenLabs** for natural, empathetic voice interactions with **Ollama** for entirely localized, private AI health analysis. Built with absolute privacy in mind, it features a **Zero Retention Mode** for HIPAA-compliant operations, ensuring that your sensitive health data is analyzed without ever being stored persistently.

---

## ✨ Key Features

### 🎙️ Voice-Activated Symptom Logger
- **Natural Interaction:** Log your daily symptoms naturally using just your voice.
- **Local AI Analysis:** Ollama analyzes speech to classify severity and detect alarming patterns.
- **Empathetic Feedback:** Receive human-like audio feedback powered by ElevenLabs.

### 🔒 Zero Retention Mode (HIPAA Compliant)
- **Ultimate Privacy:** Toggle privacy mode to ensure sensitive health data is processed on-the-fly.
- **No Persistent Storage:** When enabled, absolutely no data is written to the database.
- **100% Local Inference:** Your health data never leaves your machine for AI processing.

### 🧪 Smart Lab Results & Interactions
- **Plain-Language Labs:** View lab results with AI-powered, easy-to-understand explanations.
- **Drug Interaction Checker:** Locally checks your prescribed medications for potentially dangerous interactions.
- **Trend Analysis:** Visual trend tracking for critical metrics (e.g., "HbA1c improved by 11%").

### 📅 Appointment Preparation Coach
- **Pre-visit Summaries:** Generates comprehensive summaries before your doctor visits.
- **Smart Prompts:** Suggests personalized questions based on recent symptom logs.
- **Shareable Briefs:** Synthesizes everything into a shareable brief for your provider.

---

## 🛠️ Technology Stack

The application is split into a lightning-fast React frontend and a robust Node.js backend, powered by local LLMs.

| Component | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion, Lucide React |
| **Backend** | Node.js, Express, Better-SQLite3 |
| **AI Inference** | **Ollama** (qwen3.5 / llama3) for private, local NLP |
| **Voice & Speech** | ElevenLabs API, Native Web Speech API |

---

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Ollama](https://ollama.ai/) installed and running locally
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vrushabhzade/Chronic-Disease-Copilot-for-Patients.git
   cd Chronic-Disease-Copilot-for-Patients
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   # Voice Settings (Required for TTS)
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   
   # Local AI Configuration (Ollama)
   OLLAMA_MODEL=qwen3.5:latest
   
   # Server Configuration
   PORT=3001
   ```

4. **Ensure Ollama is running:**
   ```bash
   # Download the model if you haven't already
   ollama pull qwen3.5
   
   # Serve Ollama (usually runs in the background automatically)
   ollama serve
   ```

### Running the Application

Run both the frontend and backend concurrently with a single command:

```bash
npm run dev:full
```

*Alternatively, run them individually:*
- **Frontend only:** `npm run dev` (Runs on `http://localhost:5174`)
- **Backend only:** `npm run server` (Runs on `http://localhost:3001`)

---

## 📱 Usage Guide

1. **Dashboard:** The central hub for your health metrics, daily tasks, and quick actions.
2. **Symptom Logging:** Click the microphone icon to speak your symptoms. The local AI will dynamically adjust to your context.
3. **Privacy Toggle:** Use the switch in the dashboard to enable/disable "Zero Retention Mode" on the fly.
4. **Interactions Check:** Add your medications to see local, AI-powered drug interaction warnings.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <i>Built with ❤️ for better patient outcomes.</i>
</div>