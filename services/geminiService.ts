
import { GoogleGenAI, Type } from "@google/genai";
import { PedagogicalGuidance } from "../types";

const SYSTEM_INSTRUCTION = `You are an expert pedagogical assistant for government school teachers in low-resource settings. 
Your goal is to provide immediate, actionable help during a live class.
The teacher is under stress. Use very simple language. Avoid educational jargon.

Required JSON Structure:
1. "doNow": One direct classroom action (Max 15 words).
2. "timeEstimate": A short time indicator like "Done immediately" or "~5 minutes".
3. "explainLikeThis": A simple 1-2 sentence script for the teacher to say (Max 25 words).
4. "tryThisActivity": A 5-minute activity using simple materials (Max 25 words).
5. "rationale": 1-2 concise lines explaining why this suggestion works (Max 30 words).
6. "badges": An array of 2-3 suitable badges from: ["Low-resource friendly", "Mixed-ability safe", "Quick to apply", "Classroom-tested"].
7. "alternativeStrategy": One single alternative approach if the first doesn't work (Max 20 words).
8. "reinforcingAction": A simple next step if the current strategy is working, focusing on consolidating learning (Max 15 words).
9. "backupAction": A different tactical move if the current strategy isn't working well (Max 15 words).

Avoid bullets. Be extremely concise. Use clear, helpful tone.`;

export const getPedagogicalAdvice = async (problem: string): Promise<{ data: PedagogicalGuidance, isFallback: boolean }> => {
  try {
    // Initialize inside the function to ensure we use the current environment's API key.
    // Ensure process.env.API_KEY is available.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    
    const response = await ai.models.generateContent({
      // Reverting to the recommended stable model for basic text tasks
      model: "gemini-3-flash-preview",
      contents: problem,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            doNow: { type: Type.STRING },
            timeEstimate: { type: Type.STRING },
            explainLikeThis: { type: Type.STRING },
            tryThisActivity: { type: Type.STRING },
            rationale: { type: Type.STRING },
            badges: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            alternativeStrategy: { type: Type.STRING },
            reinforcingAction: { type: Type.STRING },
            backupAction: { type: Type.STRING },
          },
          required: ["doNow", "timeEstimate", "explainLikeThis", "tryThisActivity", "rationale", "badges", "alternativeStrategy", "reinforcingAction", "backupAction"],
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    const data = JSON.parse(jsonStr) as PedagogicalGuidance;
    
    return { data, isFallback: false };
  } catch (error) {
    console.error("Gemini API Error Detail:", error);
    // Return high-quality offline-ready guidance as a fallback to ensure the app remains functional.
    return {
      data: {
        doNow: "Ask the class to pause and take three deep breaths together.",
        timeEstimate: "Done immediately",
        explainLikeThis: "Tell students: 'Sometimes learning is like climbing a hill. It feels hard now, but the view at the top is worth it.'",
        tryThisActivity: "Have students draw one thing they understood so far on their slates or paper.",
        rationale: "Breathing resets the nervous system and drawing helps consolidate memory.",
        badges: ["Quick to apply", "Mixed-ability safe"],
        alternativeStrategy: "Write one large question on the board and ask students to discuss it in pairs.",
        reinforcingAction: "Ask students to show their drawings to a partner.",
        backupAction: "Do a quick whole-class physical stretch to regain focus."
      },
      isFallback: true
    };
  }
};
