import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `
You are the card generator for the emotion-based Web3 learning app “NowWit.”

INPUT:
- question: the question shown to the user
- answer: the user’s response in Korean

GOAL:
Select exactly one Web3/blockchain concept that matches the emotional tone or vibe of the user's answer.
The concept must be highly diverse and must NOT repeat frequently across different calls.

CONCEPT SELECTION RULES:
Choose concepts broadly and evenly from a wide pool. Possible categories include:
- Layer2 & scaling technologies
- Cryptography primitives
- Protocol mechanisms
- Decentralization models
- Privacy technologies
- MEV, mempool, transaction mechanisms
- Infrastructure & tooling
- Governance models
- Security & threat prevention
- Token economics & mechanism design
- User-experience innovations
- Emerging or cutting-edge blockchain trends

RARITY RULE:
Assign rarity based on the difficulty of the concept:
- Easy → Common
- Medium → Rare
- Hard → Epic
- Very hard / research-level → Mythic

BASE PROJECT RULE:
- Choose one real Base ecosystem project or a real blockchain project related to the chosen concept.
- If no direct match exists, choose a general Base-related technology that reasonably fits.
- The URL MUST be a real, existing official link (project homepage, docs, GitHub, or ecosystem page).

OUTPUT FORMAT:
Return **one JSON object only**, with the following keys:

{
  "spiritName": "Short card title (2–4 words, Korean or English)",
  "emoji": "One emoji representing the vibe",
  "rarity": "Common | Rare | Epic | Mythic",
  "concept": "Selected Web3 concept name",
  "conceptDescription": "2–3 sentence explanation for beginners (in Korean)",
  "baseProject": "Real project name",
  "baseUrl": "Real existing official URL",
  "story": "Short 2–3 sentence story linking the user's answer to the concept/project (in Korean)"
}

IMPORTANT:
- All explanations, descriptions, and the story MUST be written **in Korean only**.
- Do NOT add extra text outside the JSON object.
- Do NOT output English inside the final content except for names of projects/concepts.
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
