# Voxel Atlas

A public MRI learning and research workspace with an interactive volume viewer, a demo synthesis workflow, federated experiment configuration, a publication directory, and protected research areas.

## Public navigation

The illustrated entrance is `/`. Its green landscape opens `/linkers`; the winding blue road leads to `/future-work`, the cloud leads to `/cloud`, and the Kuzey Marmara sign leads to `/games`. The previous research dashboard remains at `/workspace`.

The games area contains an original 20-stop coastal resource game and a fictional 24-day trading simulation. Game progress lasts for the page session, including switches between the two game tabs. Game coins are separate from research demo credits and never represent money.

`/orders` holds the stable, code-style project order list (01–20), requirements, and implementation status. Each order opens a topic-specific draft in `/chat`; navigation never sends that draft automatically. The new Business, policy/government documentation, HPC/VPN, MATLAB, TerminalAndLogs, AIEnsemble, and RealtimeVoice requests remain explicitly planned. Vault and Federated Lab link to the documentation roadmap. TerminalAndLogs records a future authenticated Linux/HPC shell and job-log viewer; no server connection or shell execution is enabled. AIEnsemble and RealtimeVoice describe future provider comparisons, combined replies, voice sessions, and the proposed 159-slice research task. Gemini, Claude, Siri, realtime voice, and trained MRI inference are not connected by this update.

## Central chat and ChatGPT connection

`/chat` provides private, account-owned conversations with project order context. Signed-out visitors can explore the interface; sign-in is required to save or read a conversation. Users can create, refresh, export, and delete their own chats. Message text is rendered as plain text. API responses, conversations, and the MCP endpoint are excluded from service-worker caching.

The Site exposes four tools at `/mcp`: `voxel_project_orders`, `voxel_list_my_chats`, `voxel_read_my_chat`, and `voxel_reply_to_my_chat`. The hosting manifest declares the MCP capability so Sites can create or refresh the owner's private connection. ChatGPT can read and reply to a selected app conversation when the user asks it to. The connection uses the caller's verified Site identity and never grants access to another member's conversations. Replies require a freshly read user message ID and an idempotency key. This does not automatically import or synchronize the history of a ChatGPT chat.

Automatic website replies use the server-only OpenAI Responses adapter when `OPENAI_API_KEY` is securely configured in hosted runtime settings. No credential is included in source or browser assets. The default model is `gpt-6-luna`; supported `OPENAI_MODEL` overrides are `gpt-6.2-sol` and `gpt-6.2-astra`. Without a configured credential, messages are still saved privately and clearly await a ChatGPT reply or AI setup. There are no fabricated AI responses.

The provider receives the public project catalog and up to the latest 20 messages of the current account-owned conversation, with `store: false`. The app stores its own chat history in D1 until the user deletes it. No private datasets or other users' records are added to the prompt. The AI can explain and draft instructions; it has no tools to change code, deploy, purchase, or authorize access. Website AI usage is separate from the imaginary demo-credit wallet.

Limits are 30 conversations per account, 100 messages per conversation, 6,000 characters per user message, and 10 automatic AI replies per account per rolling day (100 across the Site). Requests use a 45-second provider timeout and a 1,600-token response cap. A conversation lease and unique request keys prevent duplicate submissions from issuing duplicate AI requests. Failed provider calls remain visible as saved messages and are not retried automatically.

## Product boundaries

- The MRI explorer renders the included MNI reference atlas, clearly labeled synthetic teaching volumes, and local NIfTI files (.nii and .nii.gz). Files opened in the explorer remain in the browser. The fallback renderer keeps linked slices available when WebGL2 cannot initialize.
- Synthesis uses imaginary credits with no monetary value. Demonstration jobs return prepared synthetic teaching samples. Users can generate 100 demo credits at a time (five times per hour, up to a 10,000-credit refill cap), and export Python code and JSON for the selected paired-volume demonstration. Connecting trained weights and a compute service is a separate integration.
- The dataset library supports public sample discovery and private account-owned storage. Uploading or importing to the online library is an explicit action, separate from opening a local file in the explorer.
- Federated learning creates an experiment configuration. It does not launch a distributed training run, connect institutional clients, or claim live training metrics.
- Research records carry source links and verification notes. The catalog is a curated starting set, not an automatic or complete Google Scholar synchronization.
- The Vault is a demonstration challenge with a demo-credit reward. No cash prize or paid contest is activated.
- Red Room uses a platform member ID and a room password. It does not request government passport numbers.
- Installation uses a progressive web app. This repository does not contain a native C, macOS, or mobile binary.

## Runtime

The site uses the supplied Vinext/Cloudflare Worker runtime. The hosting manifest declares the existing Site identity, DB (D1), and BUCKET (R2). Schema changes are generated with Drizzle and applied as deployment migrations. Request handlers never create or alter database tables.

The platform authentication dispatcher supplies the signed-in identity. Authentication entry points remain /signin-with-chatgpt and /signout-with-chatgpt; application code does not replace these routes. Public learning pages can be visited anonymously.

ADMIN_EMAILS is configured as a secret runtime value through Sites environment settings. The verified owner signs in and creates an additional admin key on first use. Passwords and session credentials must never be placed in this repository or client-side assets.

The service worker caches only public shell assets and an offline fallback. API responses and protected routes are excluded.

## Development and publication

Use the installed Sites helpers to install dependencies, build, synchronize source, package, and publish. In the managed environment, use sites-preview with the absolute checkout path for browser verification.

After editing db/schema.ts, generate a migration with npm run db:generate. For local D1 verification, apply the generated SQL using the project Wrangler configuration and .wrangler/state persistence path. Production migrations are applied by the Sites deployment workflow.

The source repository is the durable project record. Generated build outputs, local database state, temporary browser files, and credentials are excluded from source control.

## Data attribution

See public/licenses/ATTRIBUTION.md and the accompanying license files for the reference MRI volume, NiiVue, and included source material. Synthetic practice cases are teaching illustrations, not patient records.

## Verification

Run `node tests/platform-api.test.mjs` for authorization, private file access, credit accounting, session isolation, and configuration persistence checks. Run `node tests/game-engine.test.mjs` for board-game phase/cost/win/loss behavior and simulated-trading balance limits. Both suites use synthetic fixtures and do not require production credentials.

Run `node tests/chat-api.test.mjs` for private conversation isolation, message persistence, idempotency, ChatGPT bridge authorization, and deletion. Run `node tests/chat-provider.test.mjs` for bounded Responses API request/response handling. Provider tests use fake requests; a passing test suite is not evidence of a live AI connection.

Visual verification covers the entrance, Linkers navigation, synthesis selections and credit refills, federated configuration output, publication search, game actions, and narrow-screen layouts through the managed preview.
