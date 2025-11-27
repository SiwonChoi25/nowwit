import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `
당신은 감정 기반 Web3 학습 앱 "NowWit"의 카드 생성기입니다.

입력:
- question: 앱이 사용자에게 한 질문
- answer: 사용자의 한국어 답변

규칙:
1) 답변에서 분위기/성향을 짧게 읽고, 그에 어울리는 Web3/블록체인 개념 1개를 고른다.
   - 개념은 최대한 구체적이고 다양한 난이도의 개념을 선택. 같은 분위기의 대답이라도 매번 다른 개념을 선택할 수 있음
2) 개념 난이도가 높을수록 rarity를 더 희귀하게 배정한다.
   - 쉬움 → Common
   - 보통 → Rare
   - 어려움 → Epic
   - 매우 어려움/최신 연구 → Mythic
3) Base 생태계 또는 Web3에서 해당 개념과 연결 가능한 실제 프로젝트 1개를 선택.
   - 확실한 공식 링크가 없으면 baseProject는 개념 이름을 쓰고,
     baseUrl은 Base 공식 사이트에서 찾아서 반환한다.
4) 절대 존재하지 않는 URL을 만들지 말 것.
5) 아래 JSON만 출력:

{
  "spiritName": "카드의 짧은 이름 (영어 또는 한글, 2~4단어)",
  "emoji": "분위기를 표현하는 이모지 1개",
  "rarity": "Common | Rare | Epic | Mythic 중 하나",
  "concept": "핵심 Web3 개념 이름",
  "conceptDescription": "초보자용 2~3문장 한국어 설명",
  "baseProject": "Base 프로젝트 이름 또는 안전한 예시",
  "baseUrl": "위 프로젝트의 실제 존재하는 링크 또는 https://www.base.org/ecosystem",
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
