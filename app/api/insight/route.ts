import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `
You are the card generator for the emotion-based Web3 learning app “NowWit.”

INPUT:
- question (Korean)
- answer (Korean)

GOAL:
Pick exactly one real Web3/blockchain concept that matches the emotional tone of the user's answer.  
Never invent concepts, projects, or URLs. Accuracy > diversity.

CONCEPT RULE:
Choose only well-known concepts from categories such as:
Layer2, scaling, cryptography, protocol mechanisms, decentralization, privacy, MEV/tx flow, infra/tooling, governance, security, token economics, UX, emerging trends (only if accurate).
If unsure about a concept, choose a more general and reliable one.

RARITY:
- Easy → Common  
- Medium → Rare  
- Hard → Epic  
- Very hard/research → Mythic  

BASE PROJECT RULE:
Pick one real Base ecosystem project or real blockchain project related to the concept.  
If unsure, use:  
"baseProject": "Base Ecosystem"  
"baseUrl": "https://www.base.org/ecosystem"

OUTPUT:
Return **only one JSON object**:

{
  "spiritName": "Short title (2–4 words)",
  "emoji": "One emoji",
  "rarity": "Common | Rare | Epic | Mythic",
  "concept": "Web3 concept",
  "conceptDescription": "2–3 sentence Korean explanation",
  "baseProject": "Real project name",
  "baseUrl": "Real official URL",
  "story": "2–3 sentence Korean story linking the user's answer"
}

IMPORTANT:
- Entire explanation/story MUST be in Korean.
- No extra text outside the JSON.
- No invented names, terms, or URLs.
`;

export async function POST(req: NextRequest) {
  if (!process.env.FLOCK_API_KEY) {
    return NextResponse.json(
      { error: "FLOCK_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const { question, answer } = await req.json();

  if (!answer || typeof answer !== "string") {
    return NextResponse.json(
      { error: "answer is required" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.flock.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-litellm-api-key": process.env.FLOCK_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.FLOCK_MODEL || "qwen3-30b-a3b-instruct-2507",
        stream: false,
        max_tokens: 512,
        temperature: 0.9,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({ question, answer }),
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("FLock insight error:", text);
      return NextResponse.json(
        { error: "Failed to generate insight" },
        { status: 500 },
      );
    }

    const data = await res.json();
    const content: string =
      data?.choices?.[0]?.message?.content ?? "";

    let card;
    try {
      card = JSON.parse(content);
    } catch (e) {
      console.error("Insight JSON parse error:", e, content);
      return NextResponse.json(
        { error: "Invalid response from model" },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();

    // 서버에서 id/createdAt만 붙여서 클라이언트로 전달
    const fullCard = {
      id: now,
      createdAt: now,
      ...card,
    };

    return NextResponse.json({ card: fullCard });
  } catch (err) {
    console.error("FLock insight exception:", err);
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 },
    );
  }
}
