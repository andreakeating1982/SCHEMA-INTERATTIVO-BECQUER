/**
 * Sincronizzazione altezza per embed iframe (protocollo `labvisivo:height`).
 * (portata dall'app di riferimento PAROLE-CHIAVE-INTERATTIVE)
 *
 * Quando l'app è caricata dentro un iframe (cornice dinamica su Blogger),
 * invia al parent l'altezza reale del documento così la cornice si adatta
 * automaticamente al contenuto. Aggiunge la classe `lf-embedded` al <html>
 * per disattivare i min-h-screen (evita il loop di crescita).
 */

function currentHeight(): number {
  const docEl = document.documentElement;
  const body = document.body;
  const viewportH = window.innerHeight || (docEl ? docEl.clientHeight : 0);
  let h = Math.max(
    body ? body.scrollHeight : 0,
    body ? body.offsetHeight : 0,
    docEl ? docEl.offsetHeight : 0
  );
  if (docEl && docEl.scrollHeight > viewportH) {
    h = Math.max(h, docEl.scrollHeight);
  }
  return h;
}

function corniceToken(): string {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("cornice") || "";
  } catch {
    return "";
  }
}

function sendHeight(token: string = corniceToken()): void {
  if (window.self === window.top) return;
  const height = currentHeight();
  if (height > 100) {
    // Protocollo standard (cornice dinamica nuova)
    const msg: { type: string; height: number; cornice?: string } = {
      type: "labvisivo:height",
      height,
    };
    if (token) msg.cornice = token;
    window.parent.postMessage(msg, "*");
  }
}

export function initHeightSync(): void {
  if (window.self !== window.top) {
    document.documentElement.classList.add("lf-embedded");
  }

  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "labvisivo:ping") {
      sendHeight(typeof e.data.cornice === "string" ? e.data.cornice : corniceToken());
    }
  });

  sendHeight();
  window.addEventListener("load", () => sendHeight());
  window.addEventListener("resize", () => sendHeight());

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => sendHeight());
    if (document.documentElement) ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    setTimeout(() => sendHeight(), 250);
  }

  setTimeout(sendHeight, 500);
  setTimeout(sendHeight, 1500);
}
