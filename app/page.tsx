"use client";

import { useState, useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import styles from "./page.module.css";

// Spirit 카드 타입 (UI 용)
type Rarity = "Common" | "Rare" | "Epic" | "Mythic";

interface SpiritCard {
  id: string;
  spiritName: string;
  emoji: string;
  rarity: Rarity;
  concept: string;
  conceptDescription: string;
  baseProject: string;
  baseUrl: string;
  story: string;
  createdAt: string;
}

const QUESTIONS = [
  "오늘의 기분은 어때?",
  "지금 보는 창 밖의 풍경을 한 단어로 말해줘.",
  "지금 가장 갖고 싶은 능력은 뭐야?",
  "좋아하는 색깔은?",
  "오늘 하루의 vibe를 한 문장으로 적어줘.",
];

export default function Home() {
  const { isFrameReady, setFrameReady, context } = useMiniKit();

  const [activeTab, setActiveTab] = useState<"home" | "collection">("home");
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [answer, setAnswer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCard, setCurrentCard] = useState<SpiritCard | null>(null);
  const [collection, setCollection] = useState<SpiritCard[]>([]);

  // MiniKit 초기화
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // 처음 진입 시 랜덤 질문 세팅
  useEffect(() => {
    if (!currentQuestion) {
      const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      setCurrentQuestion(q);
    }
  }, [currentQuestion]);

  const handleNewQuestion = () => {
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    setCurrentQuestion(q);
    setAnswer("");
    setCurrentCard(null);
  };

  const handleGenerateSpirit = async () => {
    if (!answer.trim()) return;

    setIsGenerating(true);

    // TODO: 여기서 /api/spirit 같은 API를 호출해서
    // 실제 FLock 결과를 받아오면 됨.
    // 일단은 UI 확인용 mock 데이터로 대체.
    const now = new Date().toISOString();

    const mockCard: SpiritCard = {
      id: now,
      spiritName: "Liquidity Flux",
      emoji: "🌧️",
      rarity: "Rare",
      concept: "AMM (Automated Market Maker)",
      conceptDescription:
        "AMM은 비가 내리듯 계속 흘러가는 유동성을 자동으로 교환해주는 온체인 마켓 메커니즘이에요.",
      baseProject: "Uniswap on Base",
      baseUrl: "https://www.base.org/ecosystem",
      story:
        "지금의 너처럼, 이 Insight는 잔잔하지만 계속해서 변화하는 시장의 mood를 닮았어.",
      createdAt: now,
    };

    setTimeout(() => {
      setCurrentCard(mockCard);
      setIsGenerating(false);
    }, 500);
  };

  const handleSaveToCollection = () => {
    if (!currentCard) return;
    setCollection((prev) =>
      prev.find((c) => c.id === currentCard.id) ? prev : [currentCard, ...prev],
    );
  };

  const renderHomeTab = () => (
    <div className={styles.content}>
      <div className={styles.mainCard}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.greeting}>
              GM, {context?.user?.displayName || "builder"} 👋
            </p>
            <h2 className={styles.title}>Today&apos;s NowWit</h2>
            <p className={styles.cardSubtitle}>
              아래 질문에 솔직하게 답해주면,
              <br />
              그 vibe에 어울리는 Web3 개념과 Base 프로젝트를
              <br />
              한 장의 Insight 카드로 만들어줄게요.
            </p>
          </div>
        </div>

        <div className={styles.questionCard}>
          <div className={styles.questionHeader}>
            <span className={styles.chip}>Q</span>
            <span className={styles.questionText}>{currentQuestion}</span>
            <button
              type="button"
              className={styles.linkButton}
              onClick={handleNewQuestion}
            >
              다른 질문 받기 ↻
            </button>
          </div>

          <textarea
            className={styles.answerInput}
            placeholder="여기에 답을 적어줘요 :)"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
          />

          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleGenerateSpirit}
            disabled={!answer.trim() || isGenerating}
          >
            {isGenerating ? "Insight 생성 중..." : "Insight 카드 만들기"}
          </button>
        </div>

        <div className={styles.resultSection}>
          {!currentCard && (
            <div className={styles.placeholderCard}>
              <p className={styles.mutedText}>
                위 질문에 답하고 버튼을 누르면,
                <br />
                여기에 오늘의 NowWit Insight 카드가 나타날 거예요 ✨
              </p>
            </div>
          )}

          {currentCard && (
            <div className={styles.spiritCard}>
              <div className={styles.spiritHeader}>
                <span className={styles.spiritEmoji}>{currentCard.emoji}</span>
                <div>
                  <p className={styles.spiritName}>{currentCard.spiritName}</p>
                  <p className={styles.spiritRarity}>{currentCard.rarity}</p>
                </div>
              </div>

              <div className={styles.spiritBody}>
                <div className={styles.spiritSection}>
                  <p className={styles.sectionLabel}>관련 Web3 개념</p>
                  <p className={styles.sectionTitle}>{currentCard.concept}</p>
                  <p className={styles.sectionText}>
                    {currentCard.conceptDescription}
                  </p>
                </div>

                <div className={styles.spiritSection}>
                  <p className={styles.sectionLabel}>Base 생태계 예시</p>
                  <p className={styles.sectionTitle}>
                    {currentCard.baseProject}
                  </p>
                  <a
                    href={currentCard.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.linkText}
                  >
                    자세히 보기 ↗
                  </a>
                </div>

                <div className={styles.spiritSection}>
                <p className={styles.sectionLabel}>Insight Note</p>
                  <p className={styles.sectionText}>{currentCard.story}</p>
                </div>
              </div>

              <div className={styles.spiritFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleSaveToCollection}
                >
                  이 카드를 컬렉션에 담기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCollectionTab = () => (
    <div className={styles.content}>
      <div className={styles.mainCard}>
        <h2 className={styles.title}>NowWit Collection</h2>
        <p className={styles.subtitle}>
          지금까지 NowWit에서 만난 Insight 카드들이에요.
        </p>

        {collection.length === 0 && (
          <div className={styles.placeholderCard}>
            <p className={styles.mutedText}>
              아직 수집한 Insight 카드가 없어요.
              <br />
              Today 탭에서 첫 번째 Insight를 만들어볼까요? 🌟
            </p>
          </div>
        )}

        {collection.length > 0 && (
          <div className={styles.collectionGrid}>
            {collection.map((card) => (
              <div key={card.id} className={styles.collectionCard}>
                <div className={styles.collectionHeader}>
                  <span className={styles.spiritEmoji}>{card.emoji}</span>
                  <div>
                    <p className={styles.spiritName}>{card.spiritName}</p>
                    <p className={styles.spiritRarity}>{card.rarity}</p>
                  </div>
                </div>
                <p className={styles.collectionConcept}>{card.concept}</p>
                <p className={styles.collectionProject}>
                  {card.baseProject}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderBottomNav = () => (
    <nav className={styles.bottomNav}>
      <button
        type="button"
        className={
          activeTab === "home"
            ? `${styles.navItem} ${styles.navItemActive}`
            : styles.navItem
        }
        onClick={() => setActiveTab("home")}
      >
        <span>🌀</span>
        <span>Today</span>
      </button>
      <button
        type="button"
        className={
          activeTab === "collection"
            ? `${styles.navItem} ${styles.navItemActive}`
            : styles.navItem
        }
        onClick={() => setActiveTab("collection")}
      >
        <span>📚</span>
        <span>Collection</span>
      </button>
    </nav>
  );

  // 그냥 바로 메인 + 컬렉션 탭 구조 렌더
  return (
    <div className={styles.container}>
      <button className={styles.closeButton} type="button">
        ✕
      </button>

      {activeTab === "home" ? renderHomeTab() : renderCollectionTab()}

      {renderBottomNav()}
    </div>
  );
}
