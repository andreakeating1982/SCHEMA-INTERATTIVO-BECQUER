import { useCallback, useEffect, useState } from "react";

/**
 * Lettura ad alta voce (Text-to-Speech) per l'inclusione (DSA/BES).
 * (portata dall'app di riferimento PAROLE-CHIAVE-INTERATTIVE)
 *
 * Legge in italiano il contenuto testuale della pagina usando l'API Web Speech
 * (`speechSynthesis`). Il pulsante "Ascolto → Leggi" nella barra di accessibilità
 * avvia/interrompe la lettura.
 *
 * SCHEMA INTERATTIVO: le PAROLE CHIAVE sono `<button>`/chip con il testo della
 * parola, quindi NON escludiamo i pulsanti (altrimenti non verrebbero lette le
 * parole!). Escludiamo solo toolbar, canvas, svg e script.
 *
 * Accorgimenti:
 *  - seleziona la migliore voce italiana disponibile;
 *  - legge TUTTA la pagina;
 *  - converte le parole MAIUSCOLE in minuscolo;
 *  - legge le date in forma naturale ("01/09/2026" → "primo settembre duemilaventisei");
 *  - legge anche etichette e valori dei campi di input.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = (v.name || "").toLowerCase();
  let score = 0;
  if (/\b(google|microsoft|apple)\b/.test(name)) score += 4;
  if (/natural|neural|premium|enhanced|online|multilingual|expressive/.test(name)) score += 5;
  if (/elsa|diego|isabella|federica|luca|bianca|giorgio|paola|carla|francesca|alice|emma|elena|marco|giulia|alessio|stefano|giovanni|ilaria/.test(name)) score += 2;
  if (v.localService) score += 1;
  return score;
}

function pickBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const italian = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("it"));
  const pool = italian.length ? italian : voices;
  return [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
}

const IT_NUMBERS: Record<number, string> = {
  0: "zero", 1: "uno", 2: "due", 3: "tre", 4: "quattro", 5: "cinque",
  6: "sei", 7: "sette", 8: "otto", 9: "nove", 10: "dieci", 11: "undici",
  12: "dodici", 13: "tredici", 14: "quattordici", 15: "quindici",
  16: "sedici", 17: "diciassette", 18: "diciotto", 19: "diciannove",
  20: "venti", 30: "trenta", 40: "quaranta", 50: "cinquanta",
  60: "sessanta", 70: "settanta", 80: "ottanta", 90: "novanta",
};

function integerToItalian(n: number): string {
  if (n < 0) return "meno " + integerToItalian(-n);
  if (n < 20) return IT_NUMBERS[n] ?? String(n);
  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const units = n % 10;
    let word = IT_NUMBERS[tens] ?? String(tens);
    if (units === 0) return word;
    if (units === 1 || units === 8) word = word.slice(0, -1);
    const unitWord = units === 3 ? "tré" : IT_NUMBERS[units] ?? String(units);
    return word + unitWord;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const h = hundreds === 1 ? "cento" : (IT_NUMBERS[hundreds] ?? String(hundreds)) + "cento";
    return rest === 0 ? h : h + integerToItalian(rest);
  }
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const t = thousands === 1 ? "mille" : integerToItalian(thousands) + "mila";
    return rest === 0 ? t : t + integerToItalian(rest);
  }
  return String(n);
}

function numberToItalian(numStr: string): string {
  const s = numStr.trim();
  if (s === "") return "";
  if (s.includes(".")) {
    const [intPart, decPart] = s.split(".");
    const intWords = integerToItalian(parseInt(intPart || "0", 10));
    const decWords = (decPart || "")
      .split("")
      .map((d) => IT_NUMBERS[Number(d)] ?? d)
      .join(" ");
    return intWords + " virgola " + decWords;
  }
  const n = parseInt(s, 10);
  if (!isNaN(n)) return integerToItalian(n);
  return s;
}

function formatDateItalian(value: string): string | null {
  const m = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12) return null;
  const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const dayWord = day === 1 ? "primo" : integerToItalian(day);
  return `${dayWord} ${MONTHS[month - 1]} ${integerToItalian(year)}`;
}

function toNaturalCase(text: string): string {
  return text
    .replace(/[A-ZÀ-Þ]{2,}/g, (w) => w.toLowerCase())
    .replace(/\bE\b/g, "e");
}

function getReadableText(): string {
  const EXCLUDE_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "CANVAS", "SVG", "IFRAME",
  ]);
  const BLOCK_TAGS = new Set([
    "DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "SECTION",
    "ARTICLE", "HEADER", "MAIN", "FOOTER", "UL", "OL", "TABLE", "TR", "BR",
  ]);

  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.replace(/\s+/g, " ").trim();
      if (t) parts.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (EXCLUDE_TAGS.has(el.tagName)) return;
    if (el.getAttribute("role") === "toolbar") return;

    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const input = el as HTMLInputElement;
      const label = input.getAttribute("aria-label")?.trim()
        || input.getAttribute("placeholder")?.trim()
        || "";
      const value = input.value?.trim() || "";
      const pieces: string[] = [];
      if (label) pieces.push(label);
      if (value && value !== label) pieces.push(formatDateItalian(value) ?? value);
      if (pieces.length) parts.push(" " + pieces.join(" ") + " ");
      return;
    }
    if (el.tagName === "SELECT") {
      const sel = el as HTMLSelectElement;
      const opt = sel.options[sel.selectedIndex]?.text?.trim() || "";
      if (opt) parts.push(" " + opt + " ");
      return;
    }

    const isBlock = BLOCK_TAGS.has(el.tagName);
    if (isBlock) parts.push(" ");
    for (const child of Array.from(el.childNodes)) walk(child);
    if (isBlock) parts.push(" ");
  };

  walk(document.body);

  let text = parts.join(" ").replace(/\s+/g, " ").trim();
  text = toNaturalCase(text);
  return text;
}

function splitSentences(text: string): string[] {
  const parts = text.replace(/([.!?;:])\s+/g, "$1\n").split("\n");
  const chunks: string[] = [];
  let buffer = "";
  const MAX = 220;
  for (const part of parts) {
    if ((buffer + " " + part).trim().length > MAX && buffer) {
      chunks.push(buffer.trim());
      buffer = part;
    } else {
      buffer = (buffer + " " + part).trim();
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.length ? chunks : [text];
}

export interface UseReadAloudResult {
  speaking: boolean;
  supported: boolean;
  toggle: () => void;
  stop: () => void;
}

export function useReadAloud(): UseReadAloudResult {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      if (!cachedVoice) cachedVoice = pickBestVoice();
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (window.speechSynthesis.speaking) {
      stop();
      return;
    }

    const text = getReadableText();
    if (!text) return;

    if (!cachedVoice) cachedVoice = pickBestVoice();

    const chunks = splitSentences(text);
    const total = chunks.length;

    window.speechSynthesis.cancel(); // evita sovrapposizioni

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = "it-IT";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      if (cachedVoice) utterance.voice = cachedVoice;

      if (index === 0) utterance.onstart = () => setSpeaking(true);
      if (index === total - 1) {
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
      } else {
        utterance.onerror = () => undefined;
      }

      window.speechSynthesis.speak(utterance);
    });
  }, [supported, stop]);

  return { speaking, supported, toggle, stop };
}
