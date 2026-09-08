# RENDER.md — Trasferire l'app da Easy-Peasy.AI a Render (via GitHub)

Questo documento spiega come portare **SCHEMA INTERATTIVO** — generata su
**Easy-Peasy.AI** — su **Render** passando da una **repository GitHub**.
Render è gratuito per progetti piccoli e mantiene l'app sempre online con un
proprio database PostgreSQL.

---

## 1. Panoramica del percorso

```
Easy-Peasy.AI  ──►  GitHub  ──►  Render
 (zip / sorgente)   (repo)      (Blueprint: PostgreSQL + Web Service Docker)
```

Il repository è già predisposto per Render:

- `render.yaml` — **Blueprint**: crea da solo il database PostgreSQL (gratis,
  regione Francoforte) e il Web Service Docker con l'app; collega
  automaticamente `DATABASE_URL` e genera `BETTER_AUTH_SECRET`.
- `Dockerfile` (radice) — build multi-stage usata da Render.
- `deploy/docker-entrypoint.sh` — al primo avvio esegue le migrazioni del
  database (`drizzle-kit push`) e poi avvia `node dist/index.js`.
- `.env.example` — elenco delle variabili d'ambiente.

## 2. Passo 1 — Esportare da Easy-Peasy.AI

1. Chiedi a Marky/Easy-Peasy.AI lo **ZIP esportabile** dell'app (contiene il
   repository completo: codice, font OpenDyslexic, cornice dinamica, skills,
   documentazione IA).
2. Estrai lo ZIP in una cartella (es. `schema-interattivo/`).

> In alternativa, se l'app è già su una repository GitHub, puoi saltare i
> passi 2–3 e usare direttamente quella repo.

## 3. Passo 2 — Caricare su GitHub (una volta sola)

Dalla cartella del progetto:

```bash
cd schema-interattivo
git init
git add -A
git commit -m "SCHEMA INTERATTIVO — sorgente completa"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/TUO-REPO.git
git push -u origin main
```

Oppure con GitHub Desktop seguendo la guida visiva `GUIDA-GITHUB-DESKTOP.html`
inclusa nel pacchetto. **Prima del push** verifica che `.gitignore` escluda
`node_modules/`, `dist/` e i file `.env*` (è già configurato).

## 4. Passo 3 — Deploy su Render

### 4a. Blueprint (consigliato — tutto automatico)

1. Vai su https://dashboard.render.com e collega GitHub.
2. **New + → Blueprint** → scegli il repository.
3. Render legge `render.yaml` e crea:
   - un **database PostgreSQL** free (`schema-db`, regione Francoforte);
   - un **web service Docker** free (`schema-interattivo`) con `NODE_ENV`,
     `BETTER_AUTH_SECRET` (generato) e `DATABASE_URL` (collegato al DB);
   - health check su `/`.
4. Clicca **Apply** e attendi il primo deploy (esegue le migrazioni DB da
   solo). L'app sarà su `https://schema-interattivo.onrender.com` (Render può
   aggiungere suffissi casuali al nome).

### 4b. Deploy manuale (senza Blueprint)

1. **New + → PostgreSQL**: crea il database gratuito e copia la
   `Internal Database URL`.
2. **New + → Web Service** → scegli il repository → Runtime **Docker**.
3. Variabili d'ambiente del servizio:

   | Variabile | Valore |
   |---|---|
   | `DATABASE_URL` | Internal Database URL del PostgreSQL appena creato |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
   | `NODE_ENV` | `production` |
   | `TRUSTED_ORIGINS` | Origini che devono poter chiamare l'app (es. `https://tuoblog.blogspot.com`) |
   | `BETTER_AUTH_URL` | `https://IL-TUO-SERVIZIO.onrender.com` (solo se usi OAuth) |
4. Deploy: il `Dockerfile` e l'entrypoint eseguono migrazioni e avvio.

## 5. Passo 4 — Verifica post-deploy

- Apri l'URL `.onrender.com`: la Home studente deve caricare.
- `/docente`: crea una classe di prova → codice a 4 cifre.
- Apri `/schema?code=XXXX` in un altro browser: lo studente entra, posiziona le
  parole, la dashboard mostra le risposte in tempo reale.
- Scarica i **PDF** (REPORT PDF / PDF BIANCO / SCHEMA COMPLETO).
- Controlla i **font OpenDyslexic**: `https://...onrender.com/fonts/OpenDyslexic-Regular.woff2`
  deve rispondere 200 con header CORS `Access-Control-Allow-Origin: *`.
- Controlla i log del servizio (nessun errore di migrazione/connessione DB).

## 6. Passo 5 — Aggiornare la cornice dinamica (embed Blogger) al nuovo URL

Se prima l'app era su Easy-Peasy (`https://becquer-schema-interattivo.easy-peasy.site`)
e ora è su Render, aggiorna la cartella `cornice-dinamica/`:

1. In `cornice-dinamica/embed-schema-interattivo-dedicata.html` (versione
   consigliata) e negli altri embed, sostituisci:
   - `APP_URL` → `https://IL-TUO-SERVIZIO.onrender.com/`
   - gli URL dei font `.../fonts/OpenDyslexic-*.woff2` → stesso nuovo dominio
2. Incolla il contenuto aggiornato nel post Blogger (vista HTML).
3. L'altezza dinamica funziona da sola: l'app invia
   `postMessage({type:"labvisio:height"})` e la cornice v3 è impermeabile e
   anti-loop.

> Per il deploy su Render NON è necessario includere nella repo i file della
> cornice, ma tenerli versionati è utile: dopo un cambio di dominio sai sempre
> dove aggiornare l'embed.

## 7. Risoluzione dei problemi

| Problema | Causa probabile | Soluzione |
|---|---|---|
| L'app non parte | `DATABASE_URL` mancante o errato | Verifica le env; l'entrypoint fallisce in modo esplicito se manca |
| `drizzle-kit push` fallisce | DB non raggiungibile / credenziali errate | Usa l'Internal Database URL del DB Render |
| 500 su `/docente` | `BETTER_AUTH_SECRET` mancante | Imposta un segreto valido |
| Font non caricati nell'iframe | CORS mancante su `/fonts` | Verifica che `server/_core/index.ts` serva `/fonts` con `Access-Control-Allow-Origin: *` |
| Embed Blogger vuoto | URL cornice ancora Easy-Peasy / iframe bloccato | Aggiorna `APP_URL` e gli URL font nella cornice (§6) |
| Sessione non persiste tra istanze | Più istanze con DB diverso | `numInstances: 1` (già in render.yaml) e un solo database |
