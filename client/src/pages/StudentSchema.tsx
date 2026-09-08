import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2, XCircle, BookOpen, Sparkles, Send,
  Clock, Loader2, User, School, X, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { computeCorrectSlotIds } from "../../../server/schema-data";

/* ────────────── Types ────────────── */

type SlotStatus = "correct" | "wrong" | "unanswered";

/* ────────────── Main component ────────────── */

export default function StudentSchema() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const code = params.get("code") || "";
  const [, navigate] = useLocation();

  /* Student state */
  const [studentSurname, setStudentSurname] = useState("");
  const [studentGivenName, setStudentGivenName] = useState("");
  const [joined, setJoined] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [classInfo, setClassInfo] = useState<any>(null);

  /* Schema state */
  // cells: { slotId: keyword } — flat map of slotId → placed keyword
  const [cells, setCells] = useState<Record<string, string>>({});
  // Keyword bank: keywords not yet placed
  const [bank, setBank] = useState<string[]>([]);
  // Currently "selected" keyword (for click-to-place mode)
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  // Currently "selected" slot (click slot first → then click a keyword)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  // Dragging state
  const [draggedKeyword, setDraggedKeyword] = useState<string | null>(null);
  // Prevents onClick from firing right after a drag-drop / touch placement (mobile)
  const dragJustEnded = useRef(false);
  // Touch drag state (mobile): ghost chip following the finger + hovered cell
  const [touchGhost, setTouchGhost] = useState<{ kw: string; x: number; y: number } | null>(null);
  const [touchOverCell, setTouchOverCell] = useState<string | null>(null);

  const [verified, setVerified] = useState(false);
  const [existingAnswersLoaded, setExistingAnswersLoaded] = useState(false);

  /* Results */
  const [finalScore, setFinalScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [classClosed, setClassClosed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sessionWasActive, setSessionWasActive] = useState(false);

  /* API */
  const joinClass = trpc.classes.join.useMutation({
    onSuccess: (data) => {
      setStudentId(data.student.id);
      setClassInfo(data.class);
      setJoined(true);
      if (data.student.completed) {
        setSubmitted(true);
        toast.success("Sei già registrato!");
      } else {
        toast.success("Sei entrato nella classe!");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  /* Load existing answers when re-entering */
  const { data: existingAnswers } = trpc.answers.list.useQuery(
    { studentId },
    { enabled: !!studentId && joined && submitted }
  );

  useEffect(() => {
    if (existingAnswers && !existingAnswersLoaded && submitted) {
      const saved: Record<string, string> = {};
      for (const ans of existingAnswers as any[]) {
        saved[ans.slotId] = ans.selectedKeyword;
      }
      if (Object.keys(saved).length > 0) {
        setCells(saved);
        setVerified(true);
        // Remove placed keywords from bank
        const placed = new Set(Object.values(saved));
        setBank((prev) => prev.filter((kw) => !placed.has(kw)));
      }
      setExistingAnswersLoaded(true);
    }
  }, [existingAnswers, existingAnswersLoaded, submitted]);

  const submitAnswer = trpc.answers.submit.useMutation();
  const completeQuiz = trpc.answers.complete.useMutation();

  /* Fetch schema grid data */
  const { data: gridRows } = trpc.schema.gridRows.useQuery();
  const { data: gridSlots } = trpc.schema.gridSlots.useQuery();
  const { data: allKeywords } = trpc.schema.keywords.useQuery();

  /* Initialize keyword bank */
  useEffect(() => {
    if (allKeywords && bank.length === 0 && !submitted) {
      setBank(shuffle([...allKeywords]));
    }
  }, [allKeywords, submitted]);

  /* Poll class state */
  const { data: currentClass } = trpc.classes.getById.useQuery(
    { id: classInfo?.id || "" },
    { enabled: !!classInfo, refetchInterval: 2000 }
  );

  const sessionStarted = currentClass?.sessionStarted || false;
  const isActive = currentClass?.isActive ?? true;
  const showSolution = (currentClass?.showSolution ?? 0) === 1;

  useEffect(() => {
    if (sessionStarted && !sessionWasActive) setSessionWasActive(true);
  }, [sessionStarted, sessionWasActive]);

  const rows = useMemo(() => gridRows || [], [gridRows]);
  const allSlots = useMemo(() => gridSlots || [], [gridSlots]);

  /* Answers map: slotId → keyword — slotId IS the cell key now */
  const answers = useMemo(() => cells, [cells]);

  const totalSlots = allSlots.length;

  /* Score computation — ordine libero delle parole all'interno di ogni fase */
  const correctCount = useMemo(() => {
    const answerList = Object.entries(answers).map(([slotId, selectedKeyword]) => ({ slotId, selectedKeyword }));
    const correctIds = computeCorrectSlotIds(answerList);
    return allSlots.filter((s: any) => correctIds.has(s.slotId)).length;
  }, [allSlots, answers]);

  const weightedScore = useMemo(() => {
    const answerList = Object.entries(answers).map(([slotId, selectedKeyword]) => ({ slotId, selectedKeyword }));
    const correctIds = computeCorrectSlotIds(answerList);
    let ws = 0;
    for (const slot of allSlots as any[]) {
      if (correctIds.has(slot.slotId)) {
        ws += (slot.slotId as string).startsWith("f5") ? 0.25 : 0.5;
      }
    }
    return ws;
  }, [allSlots, answers]);

  const allFilled = Object.keys(cells).length === totalSlots;
  const isAllCorrect = correctCount === totalSlots && verified;

  /* Place a keyword into a slot (slotId is the key) */
  const placeKeyword = useCallback((slotId: string, keyword: string) => {
    if (submitted) return;
    setCells((prev) => {
      if (prev[slotId]) return prev;

      const usedElsewhere = Object.entries(prev).find(
        ([k, v]) => v === keyword && k !== slotId
      );
      if (usedElsewhere) {
        toast.warning("Parola già usata in un'altra cella!");
        return prev;
      }

      const next = { ...prev, [slotId]: keyword };
      setBank((b) => b.filter((kw) => kw !== keyword));
      setSelectedKeyword(null);
      setSelectedSlotId(null);
      setVerified(false);
      return next;
    });
  }, [submitted]);

  /* Remove keyword from cell (return to bank) */
  const removeKeyword = useCallback((cellKey: string) => {
    if (submitted) return;
    setCells((prev) => {
      const kw = prev[cellKey];
      if (!kw) return prev;
      const next = { ...prev };
      delete next[cellKey];
      setBank((b) => [...b, kw]);
      setVerified(false);
      return next;
    });
  }, [submitted]);

  /* Persiste le parole posizionate (una riga per slot già riempito).
     Upsert: se lo studente ha già inviato, i valori vengono sovrascritti
     con gli stessi → operazione idempotente e innocua. */
  const persistPlacedAnswers = useCallback(() => {
    if (!studentId || !classInfo?.id) return;
    const answerList = Object.entries(answers).map(([slotId, selectedKeyword]) => ({ slotId, selectedKeyword }));
    const correctIds = computeCorrectSlotIds(answerList);
    for (const slot of allSlots as any[]) {
      const ans = answers[slot.slotId];
      if (!ans) continue;
      submitAnswer.mutate({
        studentId,
        classId: classInfo.id,
        slotId: slot.slotId,
        selectedKeyword: ans,
        isCorrect: correctIds.has(slot.slotId),
      });
    }
  }, [studentId, classInfo, allSlots, answers, submitAnswer]);

  /* INVIA handler */
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitAll = useCallback(() => {
    if (!studentId || !classInfo?.id) return;
    setVerified(true);
    setSubmitting(true);
    persistPlacedAnswers();

    completeQuiz.mutate(
      { studentId, score: correctCount },
      {
        onSuccess: () => {
          setSubmitting(false);
          setSubmitted(true);
          toast.success("Schema inviato con successo!");
        },
        onError: () => {
          setSubmitting(false);
          toast.error("Errore nell'invio dello schema");
        },
      }
    );
  }, [studentId, classInfo, correctCount, persistPlacedAnswers, completeQuiz]);

  const fullName = `${studentGivenName.trim()} ${studentSurname.trim()}`.trim();

  /* When teacher ends session: salva PRIMA le parole posizionate (così il
     report PDF riporta anche le risposte sbagliate date, non solo la ✘),
     poi completa con il punteggio. Se lo studente ha già premuto INVIA
     l'upsert è idempotente. */
  useEffect(() => {
    if (!showResults && !sessionStarted && sessionWasActive && joined && studentId) {
      persistPlacedAnswers();
      setFinalScore(correctCount);
      completeQuiz.mutate({ studentId, score: correctCount });
      setShowResults(true);
    }
  }, [showResults, sessionStarted, sessionWasActive, joined, studentId, persistPlacedAnswers, correctCount, completeQuiz]);

  /* When teacher closes class */
  useEffect(() => {
    if (!classClosed && !isActive && joined) setClassClosed(true);
  }, [isActive]);

  /* Join handler */
  const handleJoin = async () => {
    if (!fullName) { toast.error("Inserisci cognome e nome"); return; }
    if (!code) { toast.error("Codice classe non valido"); return; }
    joinClass.mutate({ code, studentName: fullName });
  };

  /* ─── Drag & Drop Handlers ─── */

  const handleDragStart = useCallback((keyword: string) => {
    setDraggedKeyword(keyword);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((cellKey: string, e: React.DragEvent) => {
    e.preventDefault();
    const kw = draggedKeyword;
    if (!kw) return;
    placeKeyword(cellKey, kw);
    setDraggedKeyword(null);
    dragJustEnded.current = true;
    setTimeout(() => { dragJustEnded.current = false; }, 150);
  }, [draggedKeyword, placeKeyword]);

  /* ─── Click to select — both directions:
     keyword → slot (seleziona parola, poi tocca la cella)
     slot → keyword (seleziona cella, poi tocca la parola) ─── */
  const handleKeywordClick = useCallback((keyword: string) => {
    if (submitted) return;
    // If a slot is already selected → place the keyword there
    if (selectedSlotId) {
      placeKeyword(selectedSlotId, keyword);
      setSelectedSlotId(null);
      return;
    }
    setSelectedKeyword((prev) => (prev === keyword ? null : keyword));
  }, [submitted, selectedSlotId, placeKeyword]);

  const handleCellClick = useCallback((cellKey: string) => {
    if (submitted) return;
    // Skip the click that follows a drag-drop / touch placement (mobile)
    if (dragJustEnded.current) { dragJustEnded.current = false; return; }
    // If a keyword is selected in the bank → place it in this cell
    if (selectedKeyword) {
      placeKeyword(cellKey, selectedKeyword);
      setSelectedKeyword(null);
      setSelectedSlotId(null);
      return;
    }
    // Otherwise select this empty cell (then tap a keyword to place it)
    setSelectedSlotId((prev) => (prev === cellKey ? null : cellKey));
    setSelectedKeyword(null);
  }, [submitted, selectedKeyword, placeKeyword]);

  /* ─── Touch drag (mobile) ───────────────────────────────────────────
     I touch event restano "catturati" dall'elemento su cui è iniziato il
     touchstart: un onTouchEnd sulla cella NON scatta mai trascinando dal
     chip. Serve quindi individuare la cella sotto il dito con
     document.elementFromPoint() al termine del gesto.                 */
  const touchDrag = useRef<{ kw: string; startX: number; startY: number; dragging: boolean } | null>(null);

  const cellKeyFromPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const zone = el?.closest("[data-cell-key]") as HTMLElement | null;
    if (!zone) return null;
    if (zone.getAttribute("data-cell-filled") === "1") return null; // cella già piena
    return zone.getAttribute("data-cell-key");
  };

  const resetTouchDrag = useCallback(() => {
    touchDrag.current = null;
    setTouchGhost(null);
    setTouchOverCell(null);
  }, []);

  const handleTouchStart = useCallback((keyword: string, e: React.TouchEvent) => {
    if (submitted) return;
    const t = e.touches[0];
    touchDrag.current = { kw: keyword, startX: t.clientX, startY: t.clientY, dragging: false };
  }, [submitted]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const st = touchDrag.current;
    if (!st) return;
    const t = e.touches[0];
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;
    // Sotto gli 8px è un tap, non un trascinamento
    if (!st.dragging && Math.hypot(dx, dy) < 8) return;
    st.dragging = true;
    setTouchGhost({ kw: st.kw, x: t.clientX, y: t.clientY });
    setTouchOverCell(cellKeyFromPoint(t.clientX, t.clientY));
  }, []);

  const handleTouchEndKeyword = useCallback((keyword: string, e: React.TouchEvent) => {
    const st = touchDrag.current;
    const wasDragging = !!st?.dragging;
    const touch = e.changedTouches[0];
    resetTouchDrag();
    if (submitted) return;
    // preventDefault evita il "click fantasma" che il browser genera dopo il tap
    e.preventDefault();
    if (wasDragging) {
      const cell = touch ? cellKeyFromPoint(touch.clientX, touch.clientY) : null;
      if (cell) placeKeyword(cell, keyword);
      dragJustEnded.current = true;
      setTimeout(() => { dragJustEnded.current = false; }, 250);
      return;
    }
    // Tap semplice → stessa logica del click
    handleKeywordClick(keyword);
  }, [submitted, placeKeyword, handleKeywordClick, resetTouchDrag]);

  /* Helper: get status for a specific slotId — ordine libero per fase */
  const getSlotStatus = useCallback((slotId: string): SlotStatus => {
    if (!verified && !showSolution) return "unanswered";
    const ans = answers[slotId];
    if (!ans) return "unanswered";
    const answerList = Object.entries(answers).map(([sid, kw]) => ({ slotId: sid, selectedKeyword: kw }));
    const correctIds = computeCorrectSlotIds(answerList);
    return correctIds.has(slotId) ? "correct" : "wrong";
  }, [verified, showSolution, answers]);

  /* ========== RENDER ========== */

  /* No code */
  if (!code) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col items-center justify-center gap-4 p-4">
        <BookOpen className="size-16 text-plum/50" />
        <h1 className="text-2xl font-bold text-foreground">CODICE NON VALIDO</h1>
        <p className="text-muted-foreground text-sm">Nessun codice classe fornito.</p>
        <Button onClick={() => navigate("/")} className="mt-4 bg-plum hover:bg-plum/90 text-white">TORNA ALLA HOME</Button>
      </div>
    );
  }

  /* Join screen */
  if (!joined) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col">
        <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="mb-6 flex flex-col items-center gap-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-foreground text-center font-serif">SCHEMA INTERATTIVO</h1>
            <a href="/" className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-plum/40 hover:text-plum uppercase">
              <School className="size-4" /> Home
            </a>
          </div>
        </header>
        <main className="flex-1 flex items-start justify-center px-4 pb-16">
          <Card className="bg-card border border-border/60 shadow-sm max-w-md w-full animate-pop-in">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-5">
              <div className="size-14 rounded-2xl bg-plum/15 flex items-center justify-center">
                <BookOpen className="size-7 text-plum" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground font-serif">ENTRA NELLA CLASSE</h2>
              <p className="text-sm text-muted-foreground font-serif">Codice classe: <strong className="text-plum tracking-widest">{code}</strong></p>
              <div className="w-full space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Cognome" value={studentSurname} onChange={(e) => setStudentSurname(e.target.value)} className="h-12 text-base text-center font-serif" />
                  <Input placeholder="Nome" value={studentGivenName} onChange={(e) => setStudentGivenName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleJoin()} className="h-12 text-base text-center font-serif" />
                </div>
                <Button onClick={handleJoin} disabled={joinClass.isPending || !fullName} className="w-full h-12 text-base font-semibold rounded-xl uppercase disabled:opacity-50 disabled:cursor-not-allowed bg-plum hover:bg-plum/90 text-white">
                  {joinClass.isPending ? <Loader2 className="size-5 animate-spin" /> : "ENTRA"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  /* Waiting screen */
  if (!sessionStarted && isActive && !sessionWasActive) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col">
        <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground font-serif">SCHEMA INTERATTIVO</h1>
          </div>
        </header>
        <main className="flex-1 flex items-start justify-center px-4 pb-16">
          <Card className="bg-card border border-border/60 shadow-sm max-w-md w-full animate-pop-in">
            <CardContent className="p-8 sm:p-10 flex flex-col items-center gap-6">
              <div className="size-20 rounded-2xl bg-amber-100 flex items-center justify-center animate-pulse">
                <Clock className="size-10 text-amber-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center">IN ATTESA DEL DOCENTE</h2>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Ciao <strong>{fullName}</strong>! La sessione non è ancora iniziata. Attendi che il docente avvii lo schema interattivo.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="size-2 rounded-full bg-plum animate-pulse" /> In ascolto...
              </div>
              <div className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center gap-3">
                <BookOpen className="size-5 text-plum/60" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{classInfo.name}</p>
                  <p className="text-xs text-muted-foreground">Codice: {classInfo.code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  /* Class closed */
  if (classClosed) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col">
        <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground font-serif">SCHEMA INTERATTIVO</h1>
          </div>
        </header>
        <main className="flex-1 flex items-start justify-center px-4 pb-16">
          <Card className="bg-card border border-border/60 shadow-sm max-w-md w-full animate-pop-in">
            <CardContent className="p-8 sm:p-10 flex flex-col items-center gap-6">
              <div className="size-20 rounded-2xl bg-red-50 flex items-center justify-center">
                <XCircle className="size-10 text-red-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center">IL DOCENTE HA CHIUSO LA CLASSE</h2>
              <p className="text-sm text-muted-foreground text-center max-w-xs">La sessione è terminata. Grazie per aver partecipato!</p>
              <Button onClick={() => navigate("/")} className="w-full h-12 text-base bg-plum hover:bg-plum/90 text-white rounded-xl">HOME</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  /* Session terminated - show results */
  if (showResults) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col">
        <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground font-serif">SCHEMA INTERATTIVO</h1>
          </div>
        </header>
        <main className="flex-1 flex items-start justify-center px-4 pb-16">
          <Card className="bg-card border border-border/60 shadow-sm max-w-md w-full animate-pop-in">
            <CardContent className="p-8 sm:p-10 flex flex-col items-center gap-6">
              <div className="size-20 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Clock className="size-10 text-amber-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center">SESSIONE TERMINATA</h2>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-plum">{finalScore} / {totalSlots} corrette</p>
                <p className="text-sm text-muted-foreground">Il docente ha terminato la sessione. Grazie per aver partecipato!</p>
              </div>
              <Button onClick={() => navigate("/")} className="w-full h-12 text-base bg-plum hover:bg-plum/90 text-white rounded-xl">HOME</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  /* ========== SCHEMA ACTIVE ========== */
  return (
    <div className="min-h-screen bg-background paper-grain flex flex-col">
      <div className="paper-texture" />
      <div className="container py-6 md:py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-plum/10 rounded-full text-plum text-xs font-medium tracking-wide uppercase mb-3">
            <BookOpen className="size-3.5" /> Metodo Lázaro Carreter
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#2D2A24]" style={{ fontFamily: "OpenDyslexic, Cambria, Georgia, 'Times New Roman', serif" }}>SCHEMA INTERATTIVO</h1>
        </div>

        {/* Student info + progress */}
        <div className="max-w-4xl mx-auto mb-4" style={{ fontFamily: "OpenDyslexic, Cambria, Georgia, 'Times New Roman', serif" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground tracking-wider flex items-center gap-1.5">
              <User className="size-3" /> {fullName}
            </span>
            <span className="text-xs text-muted-foreground tracking-wider">
              {Object.keys(cells).length}/{totalSlots} compilati
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-full bg-plum rounded-full transition-all duration-500 ease-in-out" style={{ width: `${(Object.keys(cells).length / totalSlots) * 100}%` }} />
          </div>
        </div>

        {/* ══════ GRIGLIA 5×4 ══════ */}
        <Card className="max-w-4xl mx-auto border-[#1B3A5C]/30 bg-white shadow-md overflow-hidden" style={{ fontFamily: "OpenDyslexic, Cambria, Georgia, 'Times New Roman', serif" }}>
          <CardContent className="p-4 md:p-6 overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th className="w-[18%] border border-[#1B3A5C]/50 p-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center bg-[#F0F4FF]" style={{ color: "#0096C7" }}>
                    FASE
                  </th>
                  <th className="w-[27%] border border-[#1B3A5C]/50 p-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center bg-[#F0F4FF] text-[#1A1A1A]">
                    DESCRIZIONE
                  </th>
                  <th className="w-[27.5%] border border-[#1B3A5C]/50 p-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center bg-[#F0F4FF]" style={{ color: "#2D6A4F" }}>
                    PAROLA CHIAVE
                  </th>
                  <th className="w-[27.5%] border border-[#1B3A5C]/50 p-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center bg-[#F0F4FF]" style={{ color: "#C2255C" }}>
                    PAROLA CHIAVE
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => {
                  const col3Slots = row.col3Slots || [];
                  const col4Slots = row.col4Slots || [];
                  const descriptionLines = (row.description as string).split(" / ");
                  return (
                    <tr key={row.id}>
                      {/* Col 1: Phase name */}
                      <td className="border border-[#1B3A5C]/50 p-2 text-center align-middle" style={{ backgroundColor: "#FAFCFF" }}>
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider" style={{ color: "#0096C7" }}>
                          {row.phaseLabel}
                        </span>
                      </td>
                      {/* Col 2: Description */}
                      <td className="border border-[#1B3A5C]/50 p-2 text-center align-middle">
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                          {descriptionLines.map((line: string, i: number) => (
                            <span key={i}>{i > 0 && <br />}{line.trim()}</span>
                          ))}
                        </span>
                      </td>
                      {/* Col 3: Drop zones — one per slot, stacked */}
                      <td className="border border-[#1B3A5C]/50 p-1 sm:p-2 text-center align-middle">
                        <div className="flex flex-col gap-1">
                          {col3Slots.map((slot: any) => (
                            <DropZone
                              key={slot.slotId}
                              cellKey={slot.slotId}
                              value={cells[slot.slotId] || null}
                              status={getSlotStatus(slot.slotId)}
                              placedColor="#2D6A4F"
                              submitted={submitted}
                              selected={selectedSlotId === slot.slotId}
                              onDrop={(e) => handleDrop(slot.slotId, e)}
                              onDragOver={handleDragOver}
                              onClick={handleCellClick}
                              onRemove={() => removeKeyword(slot.slotId)}
                              touchOver={touchOverCell === slot.slotId}
                            />
                          ))}
                        </div>
                      </td>
                      {/* Col 4: Drop zones — one per slot, stacked */}
                      <td className="border border-[#1B3A5C]/50 p-1 sm:p-2 text-center align-middle">
                        <div className="flex flex-col gap-1">
                          {col4Slots.map((slot: any) => (
                            <DropZone
                              key={slot.slotId}
                              cellKey={slot.slotId}
                              value={cells[slot.slotId] || null}
                              status={getSlotStatus(slot.slotId)}
                              placedColor="#C2255C"
                              submitted={submitted}
                              selected={selectedSlotId === slot.slotId}
                              onDrop={(e) => handleDrop(slot.slotId, e)}
                              onDragOver={handleDragOver}
                              onClick={handleCellClick}
                              onRemove={() => removeKeyword(slot.slotId)}
                              touchOver={touchOverCell === slot.slotId}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Legenda colori */}
            <div className="flex justify-center gap-4 mt-3 text-[10px] text-[#7A756E]">
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: "#0096C7" }} />
                FASE
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: "#1A1A1A" }} />
                DESCRIZIONE
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: "#2D6A4F" }} />
                PAROLA CHIAVE
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: "#C2255C" }} />
                PAROLA CHIAVE
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ══════ KEYWORD BANK ══════ */}
        <Card className="max-w-4xl mx-auto mt-4 border-[#1B3A5C]/20 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-bold tracking-wider text-[#7A756E] mb-3 uppercase text-center">
              Parole chiave — trascina oppure tocca per posizionare
            </p>
            {bank.length === 0 ? (
              <p className="text-xs text-green-700 font-medium text-center">
                <CheckCircle2 className="size-4 inline mr-1" />
                Tutte le parole sono state posizionate!
              </p>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {bank.map((kw) => (
                  <button
                    key={kw}
                    draggable={!submitted}
                    onDragStart={() => handleDragStart(kw)}
                    onTouchStart={(e) => handleTouchStart(kw, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={(e) => handleTouchEndKeyword(kw, e)}
                    onTouchCancel={resetTouchDrag}
                    onClick={() => handleKeywordClick(kw)}
                    style={{ touchAction: "none" }}
                    className={`px-3 py-2 min-h-[40px] rounded-lg text-sm font-medium shadow-sm border transition-all duration-150 select-none ${
                      selectedKeyword === kw
                        ? "bg-plum text-white border-plum scale-105 shadow-md"
                        : "bg-white text-[#2D2A24] border-[#D4C9B8] hover:border-plum/50 hover:shadow-sm cursor-grab active:cursor-grabbing"
                    } ${touchGhost?.kw === kw ? "opacity-40" : ""} ${submitted ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={submitted}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}
            {(selectedKeyword || selectedSlotId) && !submitted && (
              <p className="text-xs text-plum font-medium mt-2 text-center animate-pop-in">
                {selectedKeyword ? (
                  <>Parola selezionata: <strong>{selectedKeyword}</strong> — tocca una cella vuota per posizionarla</>
                ) : (
                  <>Cella selezionata — tocca una parola per posizionarla</>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* INVIA button */}
        {submitted ? (
          <div className="max-w-4xl mx-auto mt-5 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="size-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Schema già inviato con successo!</span>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={handleSubmitAll}
              disabled={!allFilled || submitting}
              className="bg-plum hover:bg-plum/90 text-white font-semibold shadow-sm rounded-xl uppercase px-8"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              INVIA
            </Button>
          </div>
        )}

        {/* Score */}
        {verified && (
          <Card className="max-w-4xl mx-auto mt-6 border-[#D4C9B8] bg-[#FAF6F0]/90 shadow-sm">
            <CardContent className="pt-5 pb-5 text-center">
              {isAllCorrect ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-green-700">
                    <Sparkles className="size-6" /><span className="text-xl font-bold font-serif">¡Perfecto!</span><Sparkles className="size-6" />
                  </div>
                  <p className="text-[#2D2A24]/70 text-sm">Hai ricostruito correttamente tutto lo schema dell'analisi testuale della Rima XXI secondo il metodo Lázaro Carreter.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-bold font-serif text-[#2D2A24]">
                    {correctCount} / {totalSlots} corrette · {(weightedScore / 5.0 * 10).toFixed(1)}/10
                  </p>
                  <p className="text-[#2D2A24]/70 text-sm">
                    {showSolution ? "Consulta le parole mancanti indicate sotto ogni fase." : "Rivedi le risposte sbagliate e riprova, oppure usa la soluzione per studio."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legenda punteggio */}
        <div className="max-w-4xl mx-auto mt-6 text-center">
          <div className="px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#D4C9B8]">
            <p className="text-[10px] font-medium text-[#7A756E] leading-relaxed">
              PUNTEGGIO — Solamente nella FASE 5 = 0,25 pt per risposta corretta — Tutte le altre risposte = 0,5 pt — Punteggio massimo = 10/10
            </p>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5">
            <BookOpen className="size-3 text-plum" />
            <span className="text-[11px] text-plum font-medium tracking-wide">Metodo Lázaro Carreter</span>
          </div>
        </div>
      </div>

      {/* Ghost chip che segue il dito durante il trascinamento su mobile */}
      {touchGhost && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-sm font-semibold shadow-xl bg-plum text-white border border-plum -translate-x-1/2 -translate-y-1/2 scale-110"
          style={{ left: touchGhost.x, top: touchGhost.y }}
        >
          {touchGhost.kw}
        </div>
      )}
    </div>
  );
}

/* ────────────── DropZone Component ────────────── */

function DropZone({
  cellKey,
  value,
  status,
  placedColor,
  submitted,
  selected,
  touchOver,
  onDrop,
  onDragOver,
  onClick,
  onRemove,
}: {
  cellKey: string;
  value: string | null;
  status?: SlotStatus;
  placedColor: string;
  submitted: boolean;
  selected?: boolean;
  touchOver?: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onClick: (cellKey: string) => void;
  onRemove: () => void;
}) {
  const [nativeDragOver, setNativeDragOver] = useState(false);
  // Evidenziazione attiva sia per il drag desktop sia per il dito su mobile
  const dragOver = nativeDragOver || !!touchOver;

  const handleDragOver2 = (e: React.DragEvent) => {
    e.preventDefault();
    setNativeDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => setNativeDragOver(false);

  const handleDrop2 = (e: React.DragEvent) => {
    e.preventDefault();
    setNativeDragOver(false);
    onDrop(e);
  };

  const handleClick = () => {
    if (value) {
      onRemove(); // Click placed keyword → remove
    } else {
      onClick(cellKey); // Click empty cell → place selected keyword
    }
  };

  return (
    <div
      data-cell-key={cellKey}
      data-cell-filled={value ? "1" : "0"}
      style={{ touchAction: "manipulation" }}
      className={`
        relative min-h-[44px] sm:min-h-[48px] rounded-lg border-2 border-dashed
        flex items-center justify-center cursor-default transition-all duration-150
        ${dragOver ? "border-plum bg-plum/10 scale-[1.04] ring-2 ring-plum/40" : ""}
        ${value ? "border-transparent bg-white shadow-sm cursor-pointer hover:shadow-md" : ""}
        ${!value && !dragOver && selected ? "border-plum ring-2 ring-plum/30 bg-plum/5" : ""}
        ${!value && !dragOver && !selected ? "border-[#1B3A5C]/30 bg-[#F8FAFF] hover:bg-[#F0F4FF]" : ""}
        ${submitted ? "opacity-70 cursor-not-allowed" : ""}
      `}
      onDragOver={handleDragOver2}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop2}
      onClick={handleClick}
      title={value ? "Tocca per rimuovere" : "Trascina qui una parola chiave oppure tocca per selezionare la cella"}
    >
      {value ? (
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-2 py-1 min-w-0 w-full">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wide leading-snug text-center min-w-0 [overflow-wrap:anywhere]" style={{ color: placedColor }}>
            {value}
          </span>
          {!submitted && (
            <X className="size-3 text-[#7A756E] hover:text-red-500 shrink-0" />
          )}
          {status === "correct" && <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />}
          {status === "wrong" && <XCircle className="size-3.5 text-red-600 shrink-0" />}
        </div>
      ) : (
        <span className="text-[10px] sm:text-xs text-[#7A756E]/40 select-none pointer-events-none">
          {selected ? "scegli parola" : "trascina o tocca"}
        </span>
      )}
    </div>
  );
}

/* ────────────── Helpers ────────────── */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
