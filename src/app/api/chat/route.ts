// app/api/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import { LUMI_SYSTEM_PROMPT } from "../../../lib/chatbot-instructions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// --- Types & Interfaces ---
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

// --- 1. Dynamic Model Discovery with Prioritization ---
async function fetchAvailableModels(): Promise<string[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/models?key=${GEMINI_API_KEY}&pageSize=50`,
      { next: { revalidate: 3600 } } // Cache list for 1 hour
    );

    if (!res.ok) throw new Error(`Status: ${res.status}`);
    
    const data = await res.json();
    
    return (data.models || [])
      .filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent") &&
        !m.name.includes("vision") // Keeping it text-focused for chat
      )
      .map((m: any) => m.name.replace("models/", ""))
      .sort((a: string, b: string) => {
        // Priority: 2.0 Flash > 1.5 Flash > 1.5 Pro > others
        const getPriority = (name: string) => {
          if (name.includes("2.0-flash")) return 4;
          if (name.includes("1.5-flash")) return 3;
          if (name.includes("1.5-pro")) return 2;
          return 1;
        };
        return getPriority(b) - getPriority(a);
      });

  } catch (err) {
    console.error("Model discovery failed, using hardcoded fallbacks.");
    return ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  }
}

// --- 2. Core Generation Logic ---
async function tryModel(
  model: string, 
  messages: Message[], 
  language: string
): Promise<string> {
  
  // Language Constraints
  const langConstraints: Record<string, string> = {
    sinhala: "IMPORTANT: Respond ONLY in Sinhala script (සිංහල අකුරෙන්). Stay flirty, fun, and engaging!",
    tamil: "IMPORTANT: Respond ONLY in Tamil script (தமிழ்). Stay flirty and fun!",
    english: "Respond in English. Keep the vibe flirty and playful."
  };

  const constraint = langConstraints[language] || langConstraints.english;

  const res = await fetch(
    `${BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { 
          parts: [{ text: `${LUMI_SYSTEM_PROMPT}\n\n${constraint}` }] 
        },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),

      safetySettings: [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }, // මේක NONE කරන්න, එතකොට තමයි Lumi ට රිප්ලයි එකක් දෙන්න පුළුවන් වෙන්නේ
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
],

  generationConfig: { 
  temperature: 1.0, // උපරිම randomness එක ලබා දීමට
  maxOutputTokens: 800,
  topP: 0.95,
},

      }),
      signal: AbortSignal.timeout(12000), // 12-second timeout per attempt
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) throw new Error("Empty candidate response");
  return reply;
}

// --- 3. Main Handler ---
export async function POST(req: NextRequest) {
  try {
    const { messages, language = "english" } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
    }

    const availableModels = await fetchAvailableModels();
    let lastError = "";

    // Loop through available models until one works
    for (const model of availableModels) {
      try {
        console.log(`🚀 Attempting with: ${model}`);
        const reply = await tryModel(model, messages, language);
        
        return NextResponse.json({ 
          reply, 
          model, 
          success: true 
        });

      } catch (err: any) {
        lastError = err.message;
        console.warn(`⚠️ Model ${model} failed: ${lastError}. Trying next...`);
        // Short pause before retrying next model
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // If all models in the loop fail
    return NextResponse.json(
      { error: "All AI engines are busy right now.", detail: lastError }, 
      { status: 503 }
    );

  } catch (err: any) {
    return NextResponse.json({ error: "Server Error", detail: err.message }, { status: 500 });
  }
}