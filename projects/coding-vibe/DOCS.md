# Coding Vibe — Architecture & Research Log

> 2026-07-23 | AdventureX 2026 | Last updated: after AudioChannel + company profile implementation

## Architecture Decision: OpenOPC as Orchestrator

After researching 60+ agent orchestration solutions, **OpenOPC (HKUDS/OpenOPC)** is the only framework that combines:

1. Full AI company simulation (org chart, role-based delegation, kanban workflow)
2. Native Claude Code agent driver (`claude_code.py` adapter, 659 lines)
3. 7-layer conflict resolution (DM → Meeting → Manager → Deadlock DFS → Human)
4. 10+ messaging channels + plugin architecture
5. Single-model orchestration as default

### Key finding: OpenOPC already does what "OpenOPC patterns + lopi" proposed

OpenOPC ships with `opc/layer3_agent/adapters/claude_code.py` that spawns `claude --print` as subprocess — the same thing lopi does. It also has `runtime_v2/worktree.py` for git worktree isolation. **No need for lopi — OpenOPC covers it.**

### Running OpenOPC (minimal hackathon path)

```bash
git clone https://github.com/HKUDS/OpenOPC
cd OpenOPC
uv venv --python 3.12 && source .venv/bin/activate
uv pip install -e .
uv run opc init
# Edit .opc/config/llm_config.yaml — add API key
uv run opc chat -p demo --mode task --agent native "Hello"
uv run opc chat -p demo --mode company --company-profile corporate "Build X"
```

No Docker. No Node.js needed (CLI mode). No external agent CLI needed (native mode).

---

## Voice Architecture: Full-Duplex Voice → Text Bridge → Reasoning Brain

### Why not end-to-end voice model alone

Both StepAudio 2.5 Realtime and Seeduplex are **voice-specialist models** — they handle speech I/O but do NOT support:

- ❌ General function calling / tool use
- ❌ Code reasoning (zero HumanEval/SWE-bench/GPQA scores)
- ❌ Custom tool definitions (only built-in `web_search`)

They are **mouth and ears, not brain.** OpenAI's GPT-Live uses the same split architecture (GPT-Live-1 for voice + GPT-5.5 for reasoning).

### Voice Provider Abstraction

All voice providers implement the same interface:

```python
class VoiceProvider(ABC):
    async def start(config) -> AsyncIterator[VoiceEvent]: ...
    async def speak(text: str) -> None: ...
    async def stop() -> None: ...
```

Three implementations:

| Provider | Type | API |
|----------|------|-----|
| `StepAudioProvider` | Full-duplex | WebSocket `wss://api.stepfun.com/v1/realtime` |
| `SeeduplexProvider` | Full-duplex | npm SDK `@bytedance/seed-sdk`, WebRTC |
| `HalfDuplexProvider` | Half-duplex | Any STT + TTS combo (Whisper/Deepgram + Edge/OpenAI TTS) |

### Voice Provider Comparison

| | StepAudio 2.5 | Seeduplex |
|---|---|---|
| Developer | StepFun 阶跃星辰 | ByteDance Seed |
| API | Bare WebSocket | npm SDK + WebRTC |
| Pricing | ⚠️ undisclosed | Free 100min/mo, $0.008/min |
| Scale | Unknown | 豆包 hundreds of millions |
| Noise suppress | ⚠️ unclear | ✅ `noiseSuppress: true` |
| Turn sensitivity | ❌ | ✅ `sensitivity: low/medium/high` |
| systemPrompt | Persona system | ✅ `systemPrompt` field |
| Function calling | ❌ | ❌ |
| Code reasoning | ❌ | ❌ |

**Winner for hackathon: Seeduplex** (mature SDK, free tier, WebRTC browser support, deployed at scale).

### Data flow

```
User speaks → VoiceProvider.start() → transcript events → text
  → DeepSeek-V4-Pro (OpenOPC Boss, single-model orchestrator)
  → delegate_work → Claude Code agents (code execution)
  → results → DeepSeek-V4-Pro → natural language response
  → VoiceProvider.speak(text) → user hears reply
```

---

## OpenOPC Deep Dive

### A2A Communication (Agent-to-Agent)

7-layer conflict resolution:

```
Agent stuck → send_dm() (direct message)
  → ask_peer_and_wait() (blocking query, 120s timeout)
  → start_meeting() (multi-round semantic consensus, LLM judge)
  → _escalate_to_manager() (timeout → notify manager)
  → detect_deadlocks() (DFS graph cycle detection)
  → AWAITING_HUMAN (all automated paths exhausted → your decision)
  → close_human_review (you respond, system continues)
```

Meeting rooms support:
- Multi-party structured turns (stance, proposal, vote, blocking_issues)
- Configurable decision policies (consensus, owner override, majority vote, human escalation)
- Auto-resolution of stale meetings
- Deadlock detection via DFS cycle detection on wait-for graph

### Memory System

Three-layer compaction:
1. Background session memory: every 4 messages → LLM summary → SQLite
2. Threshold-based history compaction: >85% context → LLM re-summarize
3. Runtime pipeline: 60% soft compact → 40+ messages history snip → 80% durable

Self-Grown mechanism:
- work_item completion → record outcome + strengths/weaknesses
- Same pattern repeated 2x → auto-generate SKILL.md
- Employee delta_profiles affect future task assignment

⚠️ Known gaps:
- ChromaDB declared but unused (keyword matching, not semantic search)
- `_apply_durable_compaction()` is a no-op stub
- SQLite grows unbounded (no TTL/cleanup)

### Single-Model Orchestration

OpenOPC defaults to single-model. `routing: {}` = all roles use `default_model`.

Academic consensus (2026):
- 68% of production multi-agent deployments could match results with single agent at ~3x lower cost (Nexgismo, 47 deployments)
- Multi-agent degrades 39-70% on sequential tasks (Google/MIT)
- "Orchestrator reasoning yields largest gains; sub-agent reasoning provides limited benefit" (Zywot et al.)

**Hackathon config:**
```yaml
llm:
  default_model: "deepseek/deepseek-chat"
  api_base: "https://api.deepseek.com/v1"
  api_key: "sk-..."
  routing: {}  # single model for everything
```

### Plugin Architecture

Four extension mechanisms:
- **Channels**: subclass `BaseChannel` → register in `provider_registry.py`
- **Tools**: `ToolDefinition` → `ToolRegistry`
- **MCP**: external MCP servers, auto-discovered
- **Skills**: `SKILL.md` on disk, loaded by `SkillLibrary`

AudioChannel pattern (~50 lines, following Telegram channel):
```python
class AudioChannel(PollingChannel):
    name = "audio"
    async def poll_once(self): ...
    async def send(self, message: SystemMessage): ...
```

---

## Deployment

### Hackathon: Local Mac
```bash
launchd → uv run opc ui --port 8765
        → uv run opc serve --mode company --profile coding-vibe
        → AudioChannel process (StepAudio/Seeduplex WebSocket)
```

### Production: Mac + launchd + Cloudflare Tunnel
```
~/Library/LaunchAgents/com.coding-vibe.plist
coding-vibe.onezion.top → Office UI dashboard
```

All heavy compute is cloud API (DeepSeek, StepAudio/Seeduplex, Claude Code subscription).

---

## Alternatives Considered & Rejected

| Solution | Why rejected |
|----------|-------------|
| lopi only | Redundant — OpenOPC has `claude_code.py` adapter + worktree |
| MetaGPT (69k⭐) | Software-only, no Claude Code driver, no org structure |
| CrewAI (56k⭐) | Orchestration framework, not company simulation. No Claude Code |
| AutoGen (60k⭐) | In maintenance mode. Microsoft migrating to new framework |
| ChatDev (34k⭐) | Diverged to generic workflow builder. No org memory |
| Custom from scratch | OpenOPC already exists, is MIT licensed, actively maintained |
| Docker | No Dockerfile, audio device pain, unnecessary complexity for hackathon |

---

## 3-Day Prototype Plan

| Day | Tasks |
|-----|-------|
| **Day 2** | ~~Clone OpenOPC → `uv install` → configure DeepSeek → run company mode. Write AudioChannel. Write Coding Vibe company profile + skills.~~ **DONE 2026-07-23** |
| **Day 3** | End-to-end: voice → OpenOPC orchestration → Claude Code → voice response. Test with real coding tasks. |
| **Day 4** | Demo recording, polishing, submission. |

## Implementation Progress (2026-07-23)

### AudioChannel (`opc/channels/audio.py`)

- ~100 lines, registered as `PollingChannel` with delivery_mode `polling`
- Inbound: voice transcripts pushed via `push_transcript(text)` → internal `asyncio.Queue` → `poll_once()` → `publish_inbound()`
- Outbound: `SystemMessage` → `send()` → macOS `say` (halfduplex default) or custom TTS command
- Config in `channel_config.yaml`: `voice_provider`, `stepaudio_api_key`, `seeduplex_api_key`, `tts_command`
- Registered in `provider_registry.py` with spec and config in `config.py` (`AudioChannelConfig`)
- Verified: "Channel configured: audio" on engine init, "audio channel stopped" on shutdown

### Coding Vibe Company Profile

- **Org ID:** `coding-vibe` | 4 roles: Boss, Architect, Builder, Reviewer
- **Boss** (coordinator, native execution): Voice interface, delegates to architect, speaks results back
- **Architect** (coordinator, external/claude_code): Research + design → spec → dispatch to builder
- **Builder** (worker, external/claude_code): Implements specs via Claude Code, runs tests
- **Reviewer** (worker, external/claude_code): Sanity check — correctness, security, spec compliance
- Config at `.opc/config/company_orgs/org_coding-vibe_config.yaml`
- Active org set in `org_index.yaml`
- Verified: all 4 roles appear in staffing prompt with correct hierarchy

### Usage

```bash
# Activate coding-vibe org (auto-loaded from org_index)
uv run opc exec -p demo --mode org --org coding-vibe --agent claude_code "message"

# Interactive chat with audio channel
uv run opc chat -p coding-vibe --mode org --org coding-vibe --agent claude_code
```

### Next: Day 3

- Handle interactive staffing (auto_recruit or pre-staff)
- Connect real voice provider (Seeduplex or StepAudio) to AudioChannel
- End-to-end: voice transcript → Boss → Architect → Builder (Claude Code) → Reviewer → Boss → TTS
- Test with real coding task: "add a health endpoint to this FastAPI app"

---

## References

- OpenOPC: https://github.com/HKUDS/OpenOPC
- Seeduplex API: https://seeduplex.io/api-docs
- StepFun Realtime: https://platform.stepfun.ai/docs/en/guides/models/realtime
- lopi: https://github.com/konjoai/lopi
- Addy Osmani — Agent Orchestra: https://addyosmani.com/blog/code-agent-orchestra/
- Awesome Agent Orchestrators: https://github.com/andyrewlee/awesome-agent-orchestrators
