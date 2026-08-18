# RentProof

**Photograph it before. Photograph it after. When they keep your deposit, the AI argues it back.**

Built for *Moonlighting with Gemini + Exa* (Build Club × Google DeepMind × Exa, WorkOS SF).

Renters in the US lose billions of dollars a year to security-deposit deductions that would not
survive five minutes of scrutiny — carpet traffic paths, nail holes, flat-rate "cleaning fees".
Almost nobody fights them, because fighting requires evidence you did not collect, a statute you
have not read, and a phone call you do not want to make. RentProof does all three.

Works for anything with a deposit: apartments, rental cars, camera gear, storage units.

---

## The flow

| Step | What happens | Powered by |
|---|---|---|
| 1 · Contract | Upload the lease (PDF/photo/text). It comes back with the clauses that will cost you money, the statutory deposit-return deadline for your jurisdiction, and a shot list of what to photograph. | **Gemini** (multimodal document reading) |
| 2 · Move in | Upload move-in photos. Every pre-existing defect gets logged, plus the gaps in your coverage, plus 2–4 questions whose answers change the outcome later (skippable). | **Gemini** vision |
| 3 · Move out | Upload move-out photos and paste their itemised statement. Frame-by-frame comparison, each line classified *normal wear and tear / pre-existing / your damage / unclear* and priced. | **Gemini** vision |
| 4 · Research | Finds the statute that actually applies, pulls its full text, and extracts verbatim quotable citations. Also sweeps public records for prior deposit complaints against this landlord. | **Exa** (find) + **Apify** (extract & sweep) + **Gemini** (cite) |
| 5 · Letter | Itemised demand letter that concedes what you genuinely owe — which is exactly why it gets paid — with statutes quoted verbatim and one deadline. | **Gemini** + **Resend** |
| 6 · Call | The agent phones the landlord with the full case brief loaded and negotiates. Opens by disclosing it is an AI and that the call is recorded. | **Vapi** (+ **ElevenLabs** voice) |
| 7 · Live timeline | Every step in the case writes to Convex. Vapi posts each turn of the phone call straight to a Convex HTTP action, so the transcript appears on every open tab while the landlord is still talking. Arming "call them in 14 days if they stay quiet" is a durable `scheduler.runAfter`. | **Convex** |
| 8 · Audio brief | The whole case explained out loud in the renter's own language. The people who lose the most deposit money are the ones least able to read six pages of English lease law. | **ElevenLabs** multilingual |

## Run it

```bash
npm install
cp .env.example .env.local     # fill in whatever keys you have
npm run dev                    # http://localhost:3000
```

**Every integration degrades to sample data when its key is missing**, and the UI labels it
`sample data`. So the whole flow is clickable with an empty `.env.local` — paste keys in one at a
time and watch the badges in the header turn green.

`/api/health` reports which services are live.

### Keys

| Var | Where |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `EXA_API_KEY` | https://dashboard.exa.ai |
| `APIFY_TOKEN` | https://console.apify.com/account/integrations |
| `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` | https://dashboard.vapi.ai (buy a number first) |
| `ELEVENLABS_API_KEY` | https://elevenlabs.io |
| `RESEND_API_KEY` | optional — without it, "Send email" opens your mail client instead |

## Architecture

No database, no auth, no build steps beyond Next. A case lives in one JSON file under
`.rentproof-data/` (or process memory on serverless), keyed by an id in `localStorage`.
All model calls are plain `fetch` against REST endpoints — no SDKs to break at 7pm.

```
src/lib/         gemini · exa · apify · vapi · elevenlabs · store · mock
src/app/api/     contract/analyze · photos/analyze · compare · law/research
                 landlord/lookup · argue/{letter,email,call} · voice/brief
src/components/  ContractStep · MoveInStep · MoveOutStep · ArgueStep
```

The single most important file is `src/lib/vapi.ts` — `buildCaseBrief()` is what turns a pile of
photos and statutes into something an agent can hold its ground with on a live phone call.

## Guardrails

- The comparison model is instructed to **concede real tenant damage** and price it fairly. An
  assessment that finds everything in the renter's favour is worthless in small claims.
- Citations are **fetched and quoted verbatim**, never recalled from model memory. If no source is
  retrieved, the letter is written on the facts alone and cites nothing.
- Outbound calls **disclose that they are AI-placed and recorded** in the first sentence — both the
  right thing to do and a requirement in two-party-consent states.
- Not a law firm, not legal advice.

## Demo

Click **Load demo case** in the header for a fully populated California case — stage insurance for
when venue wifi dies.

## Design

The interface follows the `landing-page-design` system in `.claude/skills/landing-page-design/`.
Concretely that means: Geist and Geist Mono only, no italics, every size on the Tailwind type scale,
spacing restricted to the token table, flat backgrounds from the approved dark set
(`#000000` `#181818` `#1F1F1F` `#272727` `#313131`), the one permitted gradient on the hero heading
text, Phosphor icons, `cubic-bezier(0.32,0.72,0,1)` on every transition, scroll reveals through
`IntersectionObserver` rather than scroll listeners, skeleton loaders shaped like the panel they
replace, and full hover, active, focus, loading, empty and error states on every control.

## Demo shortcuts

- `?case=<id>` reopens a specific case, so a demo can be handed to someone by link
- `?step=contract|move_in|move_out|dispute` jumps straight to a stage
- **Load demo case** in the header populates a complete California case


## Why Convex

A deposit case is not a session. You photograph the place on day one and do not
come back until you move out, about a year later, and in between the argument has to survive a
tab close, a new laptop and a phone call that emits a dozen events over three minutes. Three
things in this build genuinely need a backend that thinks in subscriptions and durable time:

**1. The call writes itself onto the screen.** Vapi's server webhook points at
`https://<deployment>.convex.site/vapi`, not at the Next server. Convex takes the webhook, writes
the turn, and the subscription pushes it to every device watching the case. On stage you can put
the phone on speaker and the transcript lands in the browser as the words are spoken. Nothing
polls, and the Next server is not in the path at all.

**2. Fourteen days is a first class value.** "Send the letter, and if they go quiet, call them" has
a two week gap in the middle of the sentence. `ctx.scheduler.runAfter` owns that gap: it survives
deploys, it fires with no tab open, and the scheduled action places the call itself through
`/api/argue/call`. The UI has a 20 second version of the same code path so you can watch it fire.

**3. The case outlives the browser.** `cases` holds the durable copy, keyed by a case id, so
reopening `?case=<id>` on any device brings back the photos, the verdict and the citations.

```
convex/schema.ts      cases · events · followUps
convex/cases.ts       upsert, get, timeline (reactive), logEvent
convex/followUps.ts   schedule · cancel · fire (internalAction) · markFired
convex/http.ts        POST /vapi — Vapi's webhook, straight into Convex
```

The live panel reads through a Convex subscription and paints an HTTP snapshot on mount, so a
venue network that blocks WebSockets degrades to a three second poll instead of an empty box.

### Setup

```bash
npx convex dev          # links the deployment, pushes functions, writes CONVEX_DEPLOYMENT
```

Set `APP_URL` in the Convex dashboard (Settings → Environment Variables) to your deployed app so
the scheduled follow up can actually dial. Without it the job still fires and logs what it would
have done.
