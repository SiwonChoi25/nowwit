import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `
당신은 감정 기반 Web3 학습 앱 "NowWit"의 카드 생성기입니다.

입력으로
- question: 앱이 사용자에게 한 질문
- answer: 사용자의 한국어 답변
을 받습니다.

해야 할 일:
1. 사용자의 답변에서 분위기/성향/관심사를 짧게 해석합니다.
2. 그에 어울리는 블록체인/Web3 개념 1개를 정합니다. (예: AMM, LST, DeFi, NFT, Layer2 등)
3. 블록체인/Web3 개념은 가능한 한 구체적이고 다양한 개념을 사용하세요. 같은 질문 분위기라도, 매번 다른 종류의 개념을 사용할 수 있습니다.
4. Base 생태계에서 그 개념과 연결되는 프로젝트 1개를 추천합니다.
5. 예시는 실제로 존재하는 프로젝트나 프로토콜 이름을 사용하세요.
6. 사용자가 쉽게 공부하도록, 아래 형식의 JSON 객체를 만듭니다.

반드시 아래 KEY 들만 포함된 JSON 하나만 출력하세요:

{
  "spiritName": "카드의 짧은 이름 (영어 또는 한글, 2~4단어)",
  "emoji": "분위기를 표현하는 이모지 1개",
  "rarity": "Common | Rare | Epic | Mythic 중 하나",
  "concept": "핵심 Web3 개념 이름",
  "conceptDescription": "위 개념을 초보자가 이해하기 쉽게 2~3문장 한국어로 설명",
  "baseProject": "Base 관련된 프로젝트 이름 (모르면 '예시 프로젝트'로)",
  "baseUrl": "해당 프로젝트나 Base 생태계 소개 URL (대략적이면 OK)",
  "story": "사용자의 오늘 답변과 이 개념/프로젝트를 연결해 주는 짧은 스토리 (2~3문장, 한국어)"
}
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
