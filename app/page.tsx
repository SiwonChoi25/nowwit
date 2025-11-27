"use client";

import { useState, useEffect, useMemo } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import styles from "./page.module.css";
import { QUESTIONS } from "./data/questions";


// ------ 타입 정의 ------

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

  // 기록용으로 질문/답도 같이 저장
  question: string;
  answer: string;
}

interface ConceptSummary {
  concept: string;
  conceptDescription: string;
  baseProject: string;
  baseUrl: string;
  count: number;
  firstDate: string; // 'YYYY-MM-DD'
  lastDate: string;
}

interface InsightApiResponse {
  // /api/insight 가 돌려주는 card는
  // SpiritCard에서 createdAt, question, answer 를 제외한 형태라고 가정
  card: Omit<SpiritCard, "createdAt" | "question" | "answer">;
}


const pickRandomQuestion = () =>
  QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

const DAILY_LIMIT = 5;

// YYYY-MM-DD (로컬 타임존 기준)
const getLocalDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;


const LOCAL_STORAGE_KEY = "nowwit:collection";

// =================== Home 컴포넌트 ===================

export default function Home() {
  const { isFrameReady, setFrameReady, context } = useMiniKit();

  const [activeTab, setActiveTab] = useState<"home" | "collection">("home");
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [answer, setAnswer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCard, setCurrentCard] = useState<SpiritCard | null>(null);
  const [collection, setCollection] = useState<SpiritCard[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [collectionMode, setCollectionMode] =
    useState<"calendar" | "concepts">("calendar");

  // 오늘 날짜 (로컬 기준)
  const todayKey = getLocalDateKey(new Date());

  // 캘린더용 선택 날짜
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const conceptSummaries: ConceptSummary[] = useMemo(() => {
    if (collection.length === 0) return [];
  
    const byConcept: Record<string, ConceptSummary> = {};
  
    collection.forEach((card: SpiritCard) => {
      const dateKey = getLocalDateKey(new Date(card.createdAt)); // ✅ date가 아니라 createdAt 사용
  
      const existing = byConcept[card.concept];
  
      if (!existing) {
        byConcept[card.concept] = {
          concept: card.concept,
          conceptDescription: card.conceptDescription,
          baseProject: card.baseProject,
          baseUrl: card.baseUrl,
          firstDate: dateKey,
          lastDate: dateKey,
          count: 1,
        };
      } else {
        existing.count += 1;
        if (dateKey < existing.firstDate) existing.firstDate = dateKey;
        if (dateKey > existing.lastDate) existing.lastDate = dateKey;
      }
    });
  
    return Object.values(byConcept).sort((a, b) =>
      a.concept.localeCompare(b.concept, "ko"),
    );
  }, [collection]);

  // MiniKit 초기화
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // 초기 진입 시: 질문 하나 랜덤 세팅
  useEffect(() => {
    setCurrentQuestion(pickRandomQuestion());
  }, []);

  // --- localStorage에서 collection 복원 ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SpiritCard[];
        setCollection(parsed);
      }
    } catch (e) {
      console.error("Failed to load collection from localStorage", e);
    }
  }, []);

  // --- collection 바뀔 때마다 localStorage에 저장 ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(collection),
      );
    } catch (e) {
      console.error("Failed to save collection to localStorage", e);
    }
  }, [collection]);

  // 날짜별로 카드 그룹핑
  const cardsByDate = collection.reduce<Record<string, SpiritCard[]>>(
    (acc, card) => {
      const key = getLocalDateKey(new Date(card.createdAt));
      if (!acc[key]) acc[key] = [];
      acc[key].push(card);
      return acc;
    },
    {},
  );

  // 처음 로드될 때, 컬렉션이 있으면 가장 최근 날짜를 선택
  useEffect(() => {
    if (!selectedDate && collection.length > 0) {
      setSelectedDate(getLocalDateKey(new Date(collection[0].createdAt)));
    }
  }, [collection, selectedDate]);

  // "다른 질문 받기" 버튼
  const handleNewQuestion = () => {
    setAnswer("");
    setCurrentCard(null);
    setErrorMessage(null);
    setCurrentQuestion(pickRandomQuestion());
  };

  // Insight 카드 생성
  const handleGenerateSpirit = async () => {
    if (!answer.trim()) return;
  
    setIsGenerating(true);
    setErrorMessage(null);
  
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          answer,
        }),
      });
  
      if (!res.ok) {
        // 에러 바디를 굳이 쓰지 않아도 되면 그냥 고정 메시지로
        throw new Error("Failed to generate card");
      }
  
      const data: InsightApiResponse = await res.json();
  
      const nowIso = new Date().toISOString();
  
      const newCard: SpiritCard = {
        ...data.card,
        createdAt: nowIso,
        question: currentQuestion,
        answer,
      };
  
      setCurrentCard(newCard);
  
      setCollection((prev) =>
        prev.find((c) => c.id === newCard.id) ? prev : [newCard, ...prev],
      );
    } catch (e) {
      console.error(e);
      setErrorMessage("카드 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderHomeTab = () => {
    const todayUsage = collection.filter(
      (c) => getLocalDateKey(new Date(c.createdAt)) === todayKey,
    ).length;
    const remaining = Math.max(0, DAILY_LIMIT - todayUsage);
    const isDailyLimitReached = remaining <= 0;
  
    return (
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
                그 답변에 어울리는 Web3 개념과 프로젝트를
                <br />
                한 장의 카드로 만들어줄게요.
              </p>
            </div>
          </div>
  
          {/* 🔹 일일 한도 표시 영역 */}
          <div className={styles.lifeWrapper}>
            <div className={styles.lifeHeader}>
              <span className={styles.lifeLabel}>오늘 남은 카드</span>
              <span className={styles.lifeCount}>
                {remaining}/{DAILY_LIMIT}
              </span>
            </div>
          </div>

          {isDailyLimitReached && (
            <p className={styles.limitText}>
              오늘은 5장의 NowWit 카드를 모두 모았어요. 내일 다시 만나요 ✨
            </p>
          )}
  
          <div className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <span className={styles.chip}>Q</span>
              <span className={styles.questionText}>{currentQuestion}</span>
              <button
                type="button"
                className={styles.linkButton}
                onClick={handleNewQuestion}
              >
                ↻
              </button>
            </div>
  
            <textarea
              className={styles.answerInput}
              placeholder="여기에 답을 적어주세요"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
            />
  
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleGenerateSpirit}
              disabled={!answer.trim() || isGenerating || isDailyLimitReached}
            >
              {isDailyLimitReached
                ? "오늘 한도 소진"
                : isGenerating
                ? "카드 생성 중..."
                : "카드 만들기"}
            </button>
  
            {errorMessage && (
              <p className={styles.errorText}>{errorMessage}</p>
            )}
          </div>

        <div className={styles.resultSection}>
          {!currentCard && (
            <div className={styles.placeholderCard}>
              <p className={styles.mutedText}>
                위 질문에 답하고 버튼을 누르면,
                <br />
                여기에 오늘의 NowWit 카드가 나타날 거예요 ✨
              </p>
            </div>
          )}

          {currentCard && (
            <div className={styles.spiritCard}>
              <div className={styles.spiritHeader}>
                <div className={styles.spiritHeaderLeft}>
                  <div className={styles.spiritTitleRow}>
                    <span className={styles.spiritEmoji}>{currentCard.emoji}</span>
                    <span className={styles.spiritName}>{currentCard.spiritName}</span>
                  </div>
                  <span className={styles.spiritRarity}>{currentCard.rarity}</span>
                </div>

                <span className={styles.spiritDate}>
                  {new Date(currentCard.createdAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
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
                  <p className={styles.sectionLabel}>예시</p>
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

                <div
                  className={`${styles.spiritSection} ${styles.storySection}`}
                >
                  <p className={styles.sectionLabel}>Insight Note</p>
                  <p className={styles.sectionText}>{currentCard.story}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };

  const renderCollectionTab = () => {
    // 오늘 기준 달력 (현재 월)
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0~11
  
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
  
    const days: Date[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
  
    const selectedCards = selectedDate ? cardsByDate[selectedDate] ?? [] : [];
  
    return (
      <div className={styles.content}>
        <div className={styles.mainCard}>
          <h2 className={styles.title}>Collection</h2>
          <p className={styles.subtitle}>
            지금까지 NowWit에서 만난 카드들을
            <br />
            날짜별·개념별로 돌아볼 수 있어요.
          </p>
  
          {/* 캘린더 / 개념 도감 토글 */}
          <div className={styles.collectionModeToggle}>
            <button
              type="button"
              className={
                collectionMode === "calendar"
                  ? `${styles.modeButton} ${styles.modeButtonActive}`
                  : styles.modeButton
              }
              onClick={() => setCollectionMode("calendar")}
            >
              📆 캘린더
            </button>
            <button
              type="button"
              className={
                collectionMode === "concepts"
                  ? `${styles.modeButton} ${styles.modeButtonActive}`
                  : styles.modeButton
              }
              onClick={() => setCollectionMode("concepts")}
            >
              📚 개념 도감
            </button>
          </div>
  
          {/* --- 캘린더 모드 --- */}
          {collectionMode === "calendar" && (
            <>
              <div className={styles.calendarHeader}>
                <p className={styles.calendarMonth}>
                  {year}년 {month + 1}월
                </p>
                <p className={styles.calendarHint}>
                  점이 찍힌 날짜를 눌러서 그날의 카드를 확인해보세요.
                </p>
              </div>
  
              <div className={styles.calendarGrid}>
                {days.map((day) => {
                  const key = getLocalDateKey(day);
                  const hasCards = !!cardsByDate[key];
                  const isSelected = selectedDate === key;
  
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => hasCards && setSelectedDate(key)}
                      className={
                        isSelected
                          ? `${styles.calendarCell} ${styles.calendarCellSelected}`
                          : styles.calendarCell
                      }
                    >
                      <span className={styles.calendarDayNumber}>
                        {day.getDate()}
                      </span>
                      {hasCards && <span className={styles.calendarDot} />}
                    </button>
                  );
                })}
              </div>
  
              <div className={styles.calendarDetail}>
                {selectedDate ? (
                  <>
                    <p className={styles.detailDateLabel}>
                      {selectedDate} 의 NowWit
                    </p>
  
                    {selectedCards.length === 0 && (
                      <p className={styles.mutedText}>
                        아직 이 날짜에는 카드가 없어요.
                      </p>
                    )}
  
                    {selectedCards.map((card) => (
                      <div key={card.id} className={styles.detailCard}>
                        <div className={styles.spiritHeader}>
                          <div className={styles.spiritHeaderLeft}>
                            <div className={styles.spiritTitleRow}>
                              <span className={styles.spiritEmoji}>
                                {card.emoji}
                              </span>
                              <span className={styles.spiritName}>
                                {card.spiritName}
                              </span>
                            </div>
                            <span className={styles.spiritRarity}>
                              {card.rarity}
                            </span>
                          </div>
  
                          <span className={styles.spiritDate}>
                            {new Date(card.createdAt).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </span>
                        </div>
  
                        {/* Q & A */}
                        <div className={styles.detailQA}>
                          <p className={styles.detailLabel}>Question</p>
                          <p className={styles.detailText}>{card.question}</p>
                          <p className={styles.detailLabel}>My Answer</p>
                          <p className={styles.detailText}>{card.answer}</p>
                        </div>
  
                        {/* Web3 개념 블록 */}
                        <div className={styles.detailConceptBlock}>
                          <p className={styles.detailLabel}>Web3 Insight</p>
                          <p className={styles.detailConceptTitle}>
                            {card.concept}
                          </p>
                          <p className={styles.detailText}>
                            {card.conceptDescription}
                          </p>
  
                          <p className={styles.detailLabel}>Example</p>
                          <p className={styles.detailText}>{card.baseProject}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className={styles.mutedText}>
                    아직 수집한 카드가 없어요.
                    <br />
                    Today 탭에서 첫 번째 카드를 만들어볼까요? 🌟
                  </p>
                )}
              </div>
            </>
          )}
  
          {/* --- 개념 도감 모드 --- */}
          {collectionMode === "concepts" && (
            <div className={styles.conceptList}>
              {conceptSummaries.length === 0 && (
                <p className={styles.mutedText}>
                  아직 배운 Web3 개념이 없어요.
                  <br />
                  Today 탭에서 첫 카드를 만들어볼까요? ✨
                </p>
              )}
  
              {conceptSummaries.map((c) => (
                <div key={c.concept} className={styles.conceptRow}>
                  <div className={styles.conceptRowHeader}>
                    <div>
                      <p className={styles.conceptName}>{c.concept}</p>
                      <p className={styles.conceptDates}>
                        {c.firstDate === c.lastDate
                          ? c.firstDate
                          : `${c.firstDate} ~ ${c.lastDate}`}
                        {" · "}
                        총 {c.count}장
                      </p>
                    </div>
                    <a
                      href={c.baseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.conceptLink}
                    >
                      {c.baseProject} ↗
                    </a>
                  </div>
  
                  <p className={styles.conceptDescription}>
                    {c.conceptDescription}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  

  // const renderCollectionTab = () => {
  //   // 오늘 기준 달력 (현재 월)
  //   const today = new Date();
  //   const year = today.getFullYear();
  //   const month = today.getMonth(); // 0~11

  //   const lastDay = new Date(year, month + 1, 0);
  //   const daysInMonth = lastDay.getDate();

  //   const days: Date[] = [];
  //   for (let d = 1; d <= daysInMonth; d++) {
  //     days.push(new Date(year, month, d));
  //   }

  //   const selectedCards = selectedDate ? cardsByDate[selectedDate] ?? [] : [];

  //   return (
  //     <div className={styles.content}>
  //       <div className={styles.mainCard}>
  //         <h2 className={styles.title}>Collection</h2>
  //         <p className={styles.subtitle}>
  //           지금까지 NowWit에서 만난 카드들을
  //           <br />
  //           날짜별·개념별로 돌아볼 수 있어요.
  //         </p>

  //         {/* 캘린더 / 개념 도감 토글 */}
  //         <div className={styles.collectionModeToggle}>
  //           <button
  //             type="button"
  //             className={
  //               collectionMode === "calendar"
  //                 ? `${styles.modeButton} ${styles.modeButtonActive}`
  //                 : styles.modeButton
  //             }
  //             onClick={() => setCollectionMode("calendar")}
  //           >
  //             📆 캘린더
  //           </button>
  //           <button
  //             type="button"
  //             className={
  //               collectionMode === "concepts"
  //                 ? `${styles.modeButton} ${styles.modeButtonActive}`
  //                 : styles.modeButton
  //             }
  //             onClick={() => setCollectionMode("concepts")}
  //           >
  //             📚 개념 도감
  //           </button>
  //         </div>

  //         {collectionMode === "calendar" && (
  //           <div className={styles.content}>
  //             <div className={styles.mainCard}>
  //               <h2 className={styles.title}>Collection</h2>
  //               <p className={styles.subtitle}>
  //                 지금까지 NowWit에서 만난 카드들을
  //                 <br />
  //                 캘린더로 한눈에 볼 수 있어요.
  //               </p>
      
  //               <div className={styles.calendarHeader}>
  //                 <p className={styles.calendarMonth}>
  //                   {year}년 {month + 1}월
  //                 </p>
  //                 <p className={styles.calendarHint}>
  //                   점이 찍힌 날짜를 눌러서 그날의 카드를 확인해보세요.
  //                 </p>
  //               </div>
      
  //               <div className={styles.calendarGrid}>
  //                 {days.map((day) => {
  //                   const key = getLocalDateKey(day);
  //                   const hasCards = !!cardsByDate[key];
  //                   const isSelected = selectedDate === key;
      
  //                   return (
  //                     <button
  //                       key={key}
  //                       type="button"
  //                       onClick={() => hasCards && setSelectedDate(key)}
  //                       className={
  //                         isSelected
  //                           ? `${styles.calendarCell} ${styles.calendarCellSelected}`
  //                           : styles.calendarCell
  //                       }
  //                     >
  //                       <span className={styles.calendarDayNumber}>
  //                         {day.getDate()}
  //                       </span>
  //                       {hasCards && <span className={styles.calendarDot} />}
  //                     </button>
  //                   );
  //                 })}
  //               </div>
      
  //               <div className={styles.calendarDetail}>
  //                 {selectedDate ? (
  //                   <>
  //                     <p className={styles.detailDateLabel}>
  //                       {selectedDate} 의 NowWit
  //                     </p>
      
  //                     {selectedCards.length === 0 && (
  //                       <p className={styles.mutedText}>
  //                         아직 이 날짜에는 카드가 없어요.
  //                       </p>
  //                     )}
      
  //                     {selectedCards.map((card) => (
  //                       <div key={card.id} className={styles.detailCard}>
  //                       <div className={styles.spiritHeader}>
  //                         <div className={styles.spiritHeaderLeft}>
  //                           <div className={styles.spiritTitleRow}>
  //                             <span className={styles.spiritEmoji}>{card.emoji}</span>
  //                             <span className={styles.spiritName}>{card.spiritName}</span>
  //                           </div>
  //                           <span className={styles.spiritRarity}>{card.rarity}</span>
  //                         </div>
      
  //                         <span className={styles.spiritDate}>
  //                           {new Date(card.createdAt).toLocaleDateString("ko-KR", {
  //                             year: "numeric",
  //                             month: "2-digit",
  //                             day: "2-digit",
  //                           })}
  //                         </span>
  //                       </div>
                      
  //                       {/* Q & A */}
  //                       <div className={styles.detailQA}>
  //                         <p className={styles.detailLabel}>Question</p>
  //                         <p className={styles.detailText}>{card.question}</p>
  //                         <p className={styles.detailLabel}>My Answer</p>
  //                         <p className={styles.detailText}>{card.answer}</p>
  //                       </div>
                      
  //                       {/* Web3 개념 블록 */}
  //                       <div className={styles.detailConceptBlock}>
  //                         <p className={styles.detailLabel}>Web3 Insight</p>
  //                         <p className={styles.detailConceptTitle}>{card.concept}</p>
  //                         <p className={styles.detailText}>{card.conceptDescription}</p>
                      
  //                         <p className={styles.detailLabel}>Example</p>
  //                         <p className={styles.detailText}>{card.baseProject}</p>
  //                       </div>
  //                     </div>
  //                     ))}
  //                   </>
  //                 ) : (
  //                   <p className={styles.mutedText}>
  //                     아직 수집한 카드가 없어요.
  //                     <br />
  //                     Today 탭에서 첫 번째 카드를 만들어볼까요? 🌟
  //                   </p>
  //                 )}
  //               </div>
  //             </div>
  //           </div>
  //         )}

  //         {collectionMode === "concepts" && (
  //           <div className={styles.conceptList}>
  //             {conceptSummaries.length === 0 && (
  //               <p className={styles.mutedText}>
  //                 아직 배운 Web3 개념이 없어요.
  //                 <br />
  //                 Today 탭에서 첫 카드를 만들어볼까요? ✨
  //               </p>
  //             )}

  //             {conceptSummaries.map((c) => (
  //               <div key={c.concept} className={styles.conceptRow}>
  //                 <div className={styles.conceptRowHeader}>
  //                   <div>
  //                     <p className={styles.conceptName}>{c.concept}</p>
  //                     <p className={styles.conceptDates}>
  //                       {c.firstDate === c.lastDate
  //                         ? c.firstDate
  //                         : `${c.firstDate} ~ ${c.lastDate}`}
  //                       {" · "}
  //                       총 {c.count}장
  //                     </p>
  //                   </div>
  //                   <a
  //                     href={c.baseUrl}
  //                     target="_blank"
  //                     rel="noreferrer"
  //                     className={styles.conceptLink}
  //                   >
  //                     {c.baseProject} ↗
  //                   </a>
  //                 </div>

  //                 <p className={styles.conceptDescription}>
  //                   {c.conceptDescription}
  //                 </p>
  //               </div>
  //             ))}
  //           </div>
  //         )}
  //       </div>
  //     </div>
  //   );
  // };

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

  return (
    <div className={styles.container}>
      {activeTab === "home" ? renderHomeTab() : renderCollectionTab()}

      {renderBottomNav()}
    </div>
  );
}