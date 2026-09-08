import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play, Users, User, KeyRound, Eye, EyeOff, Plus,
  Hash, Loader2, Check, CheckCircle2, XCircle, Clock, FileText, LogOut,
  BookOpen, Trash2, RotateCcw, ChevronDown, ChevronUp, School, X
} from "lucide-react";
import { toast } from "sonner";
import { generateReportPdf, generateBlankQuestionsPdf, generateCompletedSchemaPdf } from "@/lib/reportPdf";
import { SCHEMA_ROWS, GRID_SLOTS, TOTAL_SLOTS, getCorrectAnswer } from "../../../server/schema-data";

export default function TeacherPage() {
  /* ── Stati ── */
  const [clsName, setClsName] = useState("");
  const [classDate, setClassDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeClassInfo, setActiveClassInfo] = useState<any>(null);
  const [reopenCode, setReopenCode] = useState("");
  const [reopenPassword, setReopenPassword] = useState("");
  const [showReopenPassword, setShowReopenPassword] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  /* ── Tooltip nome studente: hover su PC, tap su mobile (matchMedia hover) ── */
  const [tooltipStudent, setTooltipStudent] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLElement | null>(null);

  // Chiude il tooltip quando si tocca/clicca fuori dal nome
  useEffect(() => {
    if (!tooltipStudent) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && tooltipRef.current.contains(e.target as Node)) return;
      setTooltipStudent(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("touchstart", close);
    };
  }, [tooltipStudent]);

  /* ── Query ── */
  const { data: allClasses, isLoading: loadingClasses } = trpc.classes.listAll.useQuery();
  const utils = trpc.useUtils();

  /* ── Mutations ── */
  const createClass = trpc.classes.create.useMutation({
    onSuccess: (data) => { setActiveClassInfo(data); setActiveClassId(data.id); toast.success("Classe creata!"); },
    onError: (err) => toast.error(err.message),
  });
  const closeClass = trpc.classes.close.useMutation({
    onSuccess: () => { toast.success("Classe chiusa!"); utils.classes.listAll.invalidate(); setActiveClassId(null); setActiveClassInfo(null); },
    onError: (err) => toast.error(err.message),
  });
  const startSessionMutation = trpc.classes.startSession.useMutation({
    onSuccess: () => { toast.success("Sessione avviata!"); utils.classes.listAll.invalidate(); utils.classes.getById.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const endSessionMutation = trpc.classes.endSession.useMutation({
    onSuccess: () => { toast.success("Sessione terminata!"); utils.classes.getById.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const showSolutionMutation = trpc.classes.setShowSolution.useMutation({
    onSuccess: (data) => { utils.classes.getById.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteClass = trpc.classes.delete.useMutation({
    onSuccess: () => { toast.success("Classe eliminata"); utils.classes.listAll.invalidate(); setActiveClassId(null); setActiveClassInfo(null); setExpandedStudent(null); },
    onError: (err) => toast.error(err.message),
  });
  const resetClassMutation = trpc.classes.reset.useMutation({
    onSuccess: (data) => { toast.success("Classe riavviata!"); setActiveClassInfo(data); utils.classes.listAll.invalidate(); utils.classes.getById.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const removeStudentMutation = trpc.classes.removeStudent.useMutation({
    onSuccess: () => { toast.success("Studente rimosso"); utils.classes.listAll.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  /* ── Fetch stats & students ── */
  const { data: stats } = trpc.classes.stats.useQuery(
    { id: activeClassId! },
    { enabled: !!activeClassId, refetchInterval: 5000 }
  );
  const { data: classDetail } = trpc.classes.getById.useQuery(
    { id: activeClassId! },
    { enabled: !!activeClassId }
  );

  /* ── Helpers ── */
  const handleCreate = () => {
    if (!clsName.trim()) { toast.error("Inserisci il nome della classe"); return; }
    createClass.mutate({ name: clsName.trim(), date: classDate, password: password.trim() || undefined });
  };

  const reopenClassMutation = trpc.classes.reopen.useMutation();
  const handleReopen = async () => {
    if (reopenCode.length !== 4) { toast.error("Inserisci un codice valido di 4 cifre"); return; }
    if (!reopenPassword.trim()) { toast.error("Inserisci la password della classe."); return; }
    try {
      const cls = await reopenClassMutation.mutateAsync({ code: reopenCode, password: reopenPassword });
      setActiveClassInfo(cls); setActiveClassId(cls.id);
      toast.success(`Classe ${(cls as any).name} riaperta!`);
    } catch (err: any) { toast.error(err?.message || "Classe non trovata."); }
  };

    const handleCloseClass = () => {
    if (!activeClassId) return;
    const classId = activeClassId;
    setActiveClassId(null); setActiveClassInfo(null); setExpandedStudent(null);
    closeClass.mutate({ id: classId });
  };

  const handleDeleteClass = () => {
    if (!activeClassId) return;
    if (confirm('Eliminare definitivamente la classe "' + activeClassInfo?.name + '"? Tutti i dati associati (studenti, risposte) verranno rimossi permanentemente.')) {
      const classId = activeClassId;
      setActiveClassId(null); setActiveClassInfo(null); setExpandedStudent(null);
      deleteClass.mutate({ id: classId });
    }
  };

  const handleRestartClass = () => { if (!activeClassId) return; resetClassMutation.mutate({ id: activeClassId }); };

  /* ── Active students: tutti gli studenti iscritti restano visibili ── */
  const activeStudents = useMemo(() => {
    if (!stats) return [];
    return stats.students as any[];
  }, [stats]);
  
  /* ── Total slots for real-time score display ── */
  const { data: totalSlots } = trpc.schema.totalSlots.useQuery();

  /* ── Report download ── */
  const [reportLoading, setReportLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const handleDownloadReport = useCallback(async () => {
    if (!activeClassId) return;
    setReportLoading(true);
    try {
      const data = await utils.classes.report.fetch({ id: activeClassId });
      await generateReportPdf(data);
    } catch (err: any) { toast.error(err.message || "Errore report"); }
    finally { setReportLoading(false); }
  }, [activeClassId, utils]);

  const handleDownloadBlankSchema = useCallback(async () => {
    if (!activeClassInfo) return;
    setSchemaLoading(true);
    try {
      await generateBlankQuestionsPdf({ className: activeClassInfo.name, classDate: activeClassInfo.date });
    } catch (err: any) { toast.error(err.message || "Errore PDF"); }
    finally { setSchemaLoading(false); }
  }, [activeClassInfo]);

  const handleDownloadCompletedSchema = useCallback(async () => {
    if (!activeClassInfo) return;
    setSchemaLoading(true);
    try {
      await generateCompletedSchemaPdf({
        className: activeClassInfo.name,
        classDate: activeClassInfo.date,
        classCode: activeClassInfo.code || (classDetail as any)?.code || "",
      });
    } catch (err: any) { toast.error(err.message || "Errore PDF"); }
    finally { setSchemaLoading(false); }
  }, [activeClassInfo, classDetail]);

  /* ── Score color helper ── */
  const scoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-amber-600";
    return "text-red-500";
  };

  return (
    <div className="lf-docente min-h-screen bg-background paper-grain flex items-start justify-center p-3 sm:p-4 overflow-x-hidden">
      <div className="lf-docente-card w-full max-w-6xl min-h-[580px] max-h-[92vh] bg-card rounded-2xl border border-border/60 shadow-xl flex flex-col overflow-hidden">

        {/* ═══════════ HEADER ═══════════ */}
        <header className="shrink-0 border-b border-border/40 px-5 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-bold leading-tight text-foreground">
                SCHEMA INTERATTIVO
              </h1>
            </div>
            <a
              href="/"
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-plum/40 hover:text-plum"
            >
              <Users className="size-4" />
              AREA STUDENTI
            </a>
          </div>
        </header>

        {/* ═══════════ BODY: sidebar + main ═══════════ */}
        <div className="lf-docente-body min-h-0 flex-1 flex flex-col sm:flex-row overflow-y-auto sm:overflow-hidden">

          {/* ═══ SIDEBAR ═══ */}
          <aside className="w-full sm:w-72 shrink-0 sm:border-r sm:border-l-0 border-b sm:border-b-0 border-border/40 bg-card/40 sm:overflow-y-auto block pb-4 sm:pb-0">
            <div className="p-4 space-y-5">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Plus className="size-3.5 text-plum" /> APRI UNA NUOVA CLASSE
                </h3>
                <div className="space-y-2">
                  <Input placeholder="Nome classe" value={clsName} onChange={(e) => setClsName(e.target.value)} className="h-9 text-sm text-center center-placeholder" />
                  {/* Campo data con overlay centrato: i pseudo-elementi nativi del date input non sono stilizzabili
                      in tutti i browser (Chrome recente li ignora), quindi il valore nativo è reso trasparente
                      e una scritta centrata (pointer-events-none) mostra la data. Il campo resta cliccabile. */}
                  <div className="relative">
                    <Input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} className="h-9 text-sm w-full text-transparent" style={{ color: 'transparent' }} />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-foreground">
                      {classDate ? new Date(classDate + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                    </div>
                  </div>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={`h-9 text-sm pr-8 text-center center-placeholder ${showPassword ? 'password-visible' : ''}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <Button onClick={handleCreate} disabled={createClass.isPending} className="w-full h-9 text-sm font-semibold" size="sm">
                    {createClass.isPending ? <Loader2 className="size-4 animate-spin" /> : null} CREA CLASSE
                  </Button>
                </div>
              </div>
              <hr className="border-border/40" />
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <KeyRound className="size-3.5 text-plum" /> RIAPRI UNA CLASSE
                </h3>
                <div className="space-y-2">
                  <div className="relative">
                    <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input placeholder="Codice" value={reopenCode} onChange={(e) => setReopenCode(e.target.value.replace(/\D/g, "").slice(0, 4))} className="pl-8 h-9 text-sm text-center center-placeholder" maxLength={4} />
                  </div>
                  <div className="relative">
                    <Input type={showReopenPassword ? "text" : "password"} placeholder="Password" value={reopenPassword} onChange={(e) => setReopenPassword(e.target.value)} className={`h-9 text-sm pr-8 text-center center-placeholder ${showReopenPassword ? 'password-visible' : ''}`} />
                    <button type="button" onClick={() => setShowReopenPassword(!showReopenPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showReopenPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <Button onClick={handleReopen} className="w-full h-9 text-sm font-semibold" size="sm" disabled={reopenClassMutation.isPending}>
                    {reopenClassMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null} RIAPRI
                  </Button>
                </div>
              </div>
              <hr className="border-border/40" />
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen className="size-3.5 text-plum" /> LE TUE CLASSI
                  {loadingClasses && <Loader2 className="size-3 animate-spin text-muted-foreground ml-auto" />}
                </h3>
                {!allClasses || allClasses.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">NESSUNA CLASSE ANCORA CREATA.</p>
                ) : (
                  <div className="space-y-0.5">
                    {allClasses.map((cls: any) => (
                      <div
                        key={cls.id}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground"
                      >
                        <div className={`size-2 rounded-full shrink-0 ${cls.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className="flex-1 text-center truncate font-medium">{cls.name}</span>
                        <span className="text-xs font-mono text-muted-foreground shrink-0">{cls.code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ═══ MAIN CONTENT ═══ */}
          <main className="flex-1 sm:overflow-y-auto">
            <div className="w-full p-4 sm:p-5">

              {!activeClassInfo ? (
                /* ── No class selected ── */
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="size-20 rounded-3xl bg-muted/60 flex items-center justify-center mb-6">
                    <BookOpen className="size-10 text-muted-foreground/40" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">NESSUNA CLASSE SELEZIONATA</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    CREA UNA NUOVA CLASSE DALLA BARRA LATERALE OPPURE RIAPRINE UNA GIÀ ESISTENTE.
                  </p>
                </div>
              ) : (
                /* ── Class selected ── */
                <div className="animate-pop-in space-y-6">

                  {/* ─── CARD: Info Classe (full width) ─── */}
                  <Card className="bg-primary/5 border-2 border-primary/30 shadow-md">
                    <CardContent className="p-5 sm:p-6 space-y-4 sm:space-y-5">
                      {/* Riga 1: icona + nome + data */}
                      <div className="flex items-center justify-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                          <BookOpen className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-foreground truncate text-center">{activeClassInfo.name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground text-center">
                            {activeClassInfo.date && new Date(activeClassInfo.date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {/* Riga 2: codice + CHIUDI + ELIMINA — flex-wrap per non sovrapporsi su schermi stretti */}
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-card border border-border/50 px-3 py-1.5 shrink-0">
                          <Hash className="size-4 sm:size-5 text-primary shrink-0" />
                          <span className="font-bold text-base sm:text-lg text-primary tracking-widest" style={{ fontFamily: "OpenDyslexic, Cambria, Georgia, 'Times New Roman', serif" }}>{activeClassInfo.code}</span>
                        </div>
                        <Button onClick={handleCloseClass} disabled={closeClass.isPending} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-xl h-9 px-3 text-xs sm:text-sm">
                          {closeClass.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} <span>CHIUDI</span>
                        </Button>
                        <Button onClick={() => { if (activeClassId && confirm('Eliminare definitivamente la classe "' + activeClassInfo.name + '"? Tutti i dati associati verranno rimossi.')) { deleteClass.mutate({ id: activeClassId }); } }} disabled={deleteClass.isPending} variant="outline" className="border-red-400 text-red-700 hover:bg-red-50 hover:border-red-500 rounded-xl h-9 px-3 text-xs sm:text-sm">
                          {deleteClass.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} <span>ELIMINA CLASSE</span>
                        </Button>
                      </div>
                      {/* Riga 3: statistiche + pulsanti PDF */}
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <div className="flex flex-col rounded-lg bg-card border border-emerald-300 px-3 py-2">
                            <span className="text-[10px] leading-tight text-emerald-600 text-center w-full">NUMERO STUDENTI ATTIVI<br/>NELLA SESSIONE</span>
                            <span className="font-bold text-sm text-emerald-700 text-center w-full">{activeStudents.length}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button onClick={handleDownloadReport} disabled={reportLoading} variant="outline" className="border-plum/40 text-plum hover:bg-plum/5 hover:border-plum/60 rounded-xl h-9 px-3 text-xs sm:text-sm">
                            {reportLoading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} REPORT PDF
                          </Button>
                          <Button onClick={handleDownloadBlankSchema} disabled={schemaLoading} variant="outline" className="border-emerald-400 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500 rounded-xl h-9 px-3 text-xs sm:text-sm">
                            {schemaLoading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} PDF BIANCO
                          </Button>
                          <Button onClick={handleDownloadCompletedSchema} disabled={schemaLoading} variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-50 hover:border-blue-500 rounded-xl h-9 px-3 text-xs sm:text-sm">
                            {schemaLoading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} SCHEMA COMPLETO
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ─── CARD: Studenti Attivi (full width, sotto i pulsanti PDF) ─── */}
                  <Card className="bg-card border border-border/60 shadow-md w-full">
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <Users className="size-6 text-plum" />
                        <h3 className="text-xl font-bold text-foreground tracking-tight">STUDENTI ATTIVI NELLA SESSIONE</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-6 leading-relaxed text-center">
                        TUTTI GLI STUDENTI ISCRITTI RESTANO VISIBILI.
                      </p>
                      {!stats ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <Loader2 className="size-5 animate-spin mr-2" /><span className="text-sm">Caricamento studenti...</span>
                        </div>
                      ) : activeStudents.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-muted/50 border border-dashed border-border/50">
                          <p className="text-muted-foreground text-sm text-center">NESSUNO STUDENTE ANCORA PRESENTE.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeStudents.map((student: any) => {
                            const studentAnswers = stats.answers.filter((a: any) => a.studentId === student.id);
                            const correctAnswers = studentAnswers.filter((a: any) => a.isCorrect).length;
                            const isExpanded = expandedStudent === student.id;
                            const answeredPhaseIds = new Set(
                              studentAnswers.map((a: any) => {
                                const gs = GRID_SLOTS.find((s: any) => s.slotId === a.slotId);
                                return gs?.rowId || '';
                              }).filter(Boolean)
                            );
                            // Badge IN ATTESA DI INVIO: centra il gruppo di elementi (nome+badge+pallini+X) invece di spingerli ai bordi
                            const isPendingInvio = studentAnswers.length < TOTAL_SLOTS;
                            return (
                              <div key={student.id} className="rounded-xl border border-border/50">
                                  <button
                                    onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                    className={`w-full flex flex-wrap items-center gap-2.5 px-4 py-2.5 bg-muted/30 hover:bg-muted/60 transition-colors text-center relative overflow-visible ${isPendingInvio ? 'justify-center' : ''}`}
                                  >
                                    <div className="size-2 rounded-full shrink-0 bg-gray-300"></div>
                                    <div className={`min-w-0 ${isPendingInvio ? 'flex-none' : 'flex-1'}`}>
                                      {/* Tooltip nero sul NOME: gruppo hover sul nome (come repo Quiz-interattivo-con-audio-sorgente), tap su mobile */}
                                      <span
                                        className="group relative block w-full cursor-pointer"
                                        onClick={(e) => {
                                          // Su dispositivi touch (niente hover): tap = mostra/nasconde il nome completo
                                          if (window.matchMedia('(hover: none)').matches) {
                                            e.stopPropagation();
                                            setTooltipStudent(tooltipStudent === student.id ? null : student.id);
                                          }
                                        }}
                                      >
                                        <span className="block font-bold text-sm text-foreground truncate text-center uppercase">{student.name}</span>
                                        {/* Tooltip nero: SOLO il nome — hover sul nome (gruppo), tap su mobile (stato) */}
                                        <span
                                          ref={tooltipRef}
                                          className={`pointer-events-none absolute left-1/2 top-full z-[100] mt-2 -translate-x-1/2 max-w-[85vw] rounded-lg bg-[#2C221E] px-3 py-2 text-white shadow-2xl transition-opacity duration-150 ${tooltipStudent === student.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                        >
                                          <span className="block whitespace-nowrap uppercase font-bold text-xs">{student.name}</span>
                                          {/* Freccia in ALTO verso il nome: bottom-full + border-b -> la punta punta ESATTAMENTE al nome (come da foto) */}
                                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 size-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#2C221E]" />
                                        </span>
                                      </span>
                                    </div>
                                    <div className={`text-sm font-bold shrink-0 ${studentAnswers.length < TOTAL_SLOTS ? 'text-amber-600' : correctAnswers > 0 ? scoreColor(correctAnswers) : 'text-muted-foreground'}`}>
                                      {studentAnswers.length >= TOTAL_SLOTS ? correctAnswers + '/' + (totalSlots || '12') : <span className="whitespace-nowrap text-[10px] uppercase tracking-wider font-semibold">IN ATTESA DI INVIO</span>}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 mr-2">
                                      {SCHEMA_ROWS.map((phase: any) => {
                                        const hasAnswer = answeredPhaseIds.has(phase.id);
                                        return (
                                          <div
                                            key={phase.id}
                                            className="size-3 rounded-full shrink-0"
                                            style={{
                                              backgroundColor: 'transparent',
                                              border: hasAnswer ? `2px solid ${phase.color}` : `1.5px solid ${phase.color}`,
                                            }}
                                            title={phase.phaseLabel + (hasAnswer ? ' ✓' : '')}
                                          />
                                        );
                                      })}
                                    </div>
                                    {/* span role=button: EVITA button annidato dentro button (HTML invalido -> hydration error) */}
                                    {/* Tooltip RIMUOVI STUDENTE = tooltip NATIVO del browser via title, come repo Parole-chiave-interattive-sorgente (NON nero) */}
                                    <span
                                      role="button"
                                      tabIndex={-1}
                                      aria-label="Rimuovi lo studente"
                                      title="Rimuovi lo studente"
                                      onClick={(e) => { e.stopPropagation(); removeStudentMutation.mutate({ studentId: student.id }); }}
                                      className={`inline-flex size-4 items-center justify-center rounded-full border border-red-500 text-red-500 hover:bg-red-50 shrink-0 cursor-pointer ${removeStudentMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                      <X className="size-2.5" strokeWidth={3} />
                                    </span>
                                    {studentAnswers.length > 0 && (
                                      <div className="text-muted-foreground shrink-0">
                                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                      </div>
                                    )}
                                  </button>
                                {isExpanded && studentAnswers.length > 0 && (
                                  <AnswerDetails studentAnswers={studentAnswers} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {activeStudents.length > 0 && (
                        <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-border/40">
                          <Users className="size-4 text-plum" />
                          <span className="text-sm font-medium text-foreground">{activeStudents.length} ATTIVI</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ═══ CARD: Controllo Sessione ═══ */}
                  <Card className="bg-card border border-border/60 shadow-sm">
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex flex-col gap-4">
                        {/* Titolo */}
                        <div className="flex items-center gap-3">
                          <Play className="size-5 text-plum shrink-0" />
                          <h3 className="text-lg font-bold text-foreground">SESSIONE</h3>
                        </div>

                        {/* Stato sessione e azioni */}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          {classDetail && !classDetail.isActive ? (
                            <>
                              <p className="text-sm text-muted-foreground">Classe chiusa. Riavvia per una nuova sessione.</p>
                              <Button onClick={handleRestartClass} disabled={resetClassMutation.isPending} className="h-9 px-5 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                                {resetClassMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <><RotateCcw className="size-4 mr-1.5" /> RIAVVIA CLASSE</>}
                              </Button>
                            </>
                          ) : (
                            <>
                              {classDetail?.sessionStarted ? (
                                <div className="inline-flex items-center gap-3 flex-wrap justify-center">
                                  <span className="inline-block text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
                                    Sessione attiva
                                  </span>
                                  <Button onClick={() => endSessionMutation.mutate({ id: activeClassId! })} disabled={endSessionMutation.isPending} className="h-8 px-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm">
                                    {endSessionMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5 mr-1" />}
                                    TERMINA SESSIONE
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-3">
                                  <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                                    Sessione in attesa
                                  </span>
                                  <Button onClick={() => startSessionMutation.mutate({ id: activeClassId! })} disabled={startSessionMutation.isPending} className="h-8 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                                    {startSessionMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <><Play className="size-3.5 mr-1" /> AVVIA SESSIONE</>}
                                  </Button>
                                </div>
                              )}
                              <Button
                                onClick={() => showSolutionMutation.mutate({ id: activeClassId!, show: classDetail?.showSolution ? 0 : 1 })}
                                className="h-8 px-3 text-[10px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm"
                              >
                                <Eye className="size-3.5 mr-1" />
                                {classDetail?.showSolution ? 'NASCONDI RISPOSTA ESATTA' : 'MOSTRA RISPOSTA ESATTA'}
                              </Button>
                            </>
                          )}
                        </div>

                        {activeStudents.length > 0 && (
                          <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2 border-t border-border/40">
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                              <Users className="size-3.5 text-plum" /> {activeStudents.length} ATTIVI
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )}
            </div>
          </main>
        </div>

      </div>
    </div>
  );
}

/* ─── Componente esterno: dettaglio risposte per studente ─── */

function AnswerDetails({ studentAnswers }: { studentAnswers: any[] }) {
  const slotDetails = useMemo(() => {
    const map = new Map<string, { correctAnswer: string; phaseLabel: string; rowId: string; color: string }>();
    for (const slot of GRID_SLOTS) {
      const row = SCHEMA_ROWS.find(r => r.id === slot.rowId);
      map.set(slot.slotId, {
        correctAnswer: slot.correctAnswer,
        phaseLabel: row?.phaseLabel || "",
        rowId: slot.rowId,
        color: row?.color || '#888',
      });
    }
    return map;
  }, []);

  const answersByPhase = useMemo(() => {
    if (!studentAnswers?.length) return [];
    const groups = new Map<string, any[]>();
    for (const ans of studentAnswers) {
      const detail = slotDetails.get(ans.slotId);
      const phase = detail?.phaseLabel || 'ALTRO';
      if (!groups.has(phase)) groups.set(phase, []);
      groups.get(phase)!.push({
        ...ans,
        correctAnswer: detail?.correctAnswer || '—',
        phaseLabel: phase,
        rowColor: detail?.color || '#888',
      });
    }
    const order = SCHEMA_ROWS.map(r => r.phaseLabel);
    return Array.from(groups.entries())
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  }, [studentAnswers, slotDetails]);

  return (
    <div className="border-t border-border/40 bg-muted/15 p-4 space-y-4 rounded-b-xl">
      {answersByPhase.map(([phase, answers]: [string, any[]]) => {
        const phaseColor = answers[0]?.rowColor || '#6B7280';
        return (
          <div key={phase} className="space-y-1.5">
            <p
              className="text-[10px] font-bold uppercase tracking-wider text-center"
              style={{ color: phaseColor }}
            >
              {phase}
            </p>
            {answers
              .sort((a: any, b: any) => a.slotId.localeCompare(b.slotId))
              .map((answer: any) => {
                const word = answer.selectedKeyword || answer.selectedAnswer || '—';
                return (
                  <div key={answer.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/70 border border-border/30">
                    <span className="text-muted-foreground font-mono text-[11px] w-5 shrink-0 leading-4">#</span>
                    {answer.isCorrect ? (
                      <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <span className={`block text-xs font-medium break-words uppercase ${answer.isCorrect ? 'text-green-700' : 'text-red-600'}`} title={word}>
                        {word}
                      </span>
                      {!answer.isCorrect && (
                        <span className="block text-xs font-medium text-green-700 break-words uppercase" title={answer.correctAnswer}>
                          <span className="text-muted-foreground mr-1">→</span>{answer.correctAnswer}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}