# Classroom Decision Support System: Documentation

A minimal, real-time pedagogical assistant designed for teachers in high-stress classroom environments. This system leverages Gemini's multimodal capabilities to provide instant, actionable guidance.

---

## 🚀 Current Features

### 1. Real-Time Voice Assistant (Gemini Live)
*   **Hands-Free Interaction:** A toggleable microphone session utilizing the `gemini-2.5-flash-native-audio` model for low-latency conversations.
*   **Silence Detection:** Smart automatic session termination after 5 seconds of inactivity to conclude turns gracefully and save resources.
*   **Live Transcription:** Real-time dual-display of user context and AI pedagogical feedback.
*   **Visual Volume Meter:** A dynamic input level indicator providing immediate visual confirmation that the microphone is active.
*   **Natural Speech Output:** High-quality audio responses using a professional, supportive voice ('Zephyr').

### 2. Structured Text-Based Support
*   **Contextual Problem Input:** A focus-optimized textarea for manual input of specific classroom challenges.
*   **One-Tap Demo Prompts:** Preset triggers for common scenarios (noise levels, mixed-ability groups, restlessness) for rapid assistance.
*   **Categorized Advice Cards:** Structured output designed for quick scanning:
    *   **Do This Now:** Immediate physical interventions.
    *   **Explain Like This:** Ready-to-use verbal scripts for students.
    *   **Class Activity:** 5-minute, low-resource tactical exercises.

### 3. Interactive Pedagogical Depth
*   **Rationale Toggle:** An expandable section detailing the "why" behind the advice, linking strategies to psychological or pedagogical theory.
*   **Plan B (Alternative Strategy):** An automatically generated secondary approach for cases where the primary suggestion isn't viable.
*   **Efficiency Badges:** Visual tags (e.g., "Quick to apply," "Low-resource friendly") to help teachers prioritize actions.

### 4. Feedback & Adaptive Logic
*   **Reflection Loop:** Simple "Yes" / "Not quite" feedback buttons to track the effectiveness of suggestions.
*   **Dynamic Follow-ups:** Contextual "next steps" that pivot based on success—providing reinforcing actions for wins and tactical backups for ongoing struggles.

### 5. Resilience & Reliability
*   **Offline Fallback Mode:** Robust error handling that serves high-quality, pre-approved guidance even when the API is unreachable or the network is spotty.
*   **Mobile-First UI:** A high-contrast, minimal design built for reliability on mobile devices in busy environments.

---

## ✅ Verification Checklist

### 1. Testing Voice Interaction
- [ ] **Mic Activation:** Click the microphone icon. Confirm the red "Live" pulse appears and the blue level meter reacts to your voice.
- [ ] **AI Response:** Describe a problem (e.g., *"My class is very noisy during math"*). Confirm you hear an audio response and see "AI Feedback" text.
- [ ] **Transcription:** Verify that the "Your Context" section accurately reflects your spoken input.
- [ ] **Auto-Stop:** Stop speaking and wait. Confirm the session closes automatically after 5 seconds of silence.

### 2. Testing Text Interventions
- [ ] **Demo Prompts:** Click a demo prompt (e.g., *"Students look bored"*). Confirm it populates the text field.
- [ ] **Advice Generation:** Click "Get Structured Advice." Confirm the loading spinner appears and then transitions into the three advice cards.
- [ ] **Card Structure:** Ensure the "Do Now," "What to Say," and "Class Activity" cards contain specific, actionable instructions.

### 3. Testing Interactive Elements
- [ ] **Rationale:** Click "The Pedagogy behind this." Ensure the section expands with a clear, italicized explanation.
- [ ] **Feedback Logic:** 
    - Click **"Yes."** Confirm a blue "Consolidate learning" box appears.
    - Click **"Not quite."** Confirm the box updates to show an "Alternative tactical move."

### 4. Testing System Reliability
- [ ] **Manual Stop:** During a live session, click the red "Square" icon. Confirm the session ends immediately and audio stops.
- [ ] **Fallback Check:** (Optional) Disconnect internet and request advice. Verify the app shows the "Breathing exercise" strategy and the "Offline-ready" footer.
- [ ] **Responsiveness:** Resize the browser window to a mobile width. Verify that cards stack neatly and no UI elements overlap or become unclickable.
