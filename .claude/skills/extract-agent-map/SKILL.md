# Skill: extract-agent-map

**Invocation:** `/extract-agent-map`

---

## Purpose

Read `business-blueprint.json` and generate three downstream planning
documents from it:

| File | What it contains |
|------|-----------------|
| `docs/blueprints/agent-map.md` | Visual + tabular inventory of every agent in the system |
| `docs/blueprints/build-priority.md` | Sprint-ready ordered build list with effort and impact |
| `docs/blueprints/assumptions-and-gaps.md` | Actionable risk register sorted by severity |

This skill does not invoke an agent — it reads the JSON directly and writes
the three files itself. It is a deterministic extraction, not a generative
task.

---

## When to Use

- After `/audit-blueprint` returns `APPROVED` or a usability `PASS`
- When the user wants to start sprint planning from the blueprint
- When the agent map or build priority has changed and documents need to be
  refreshed
- User says: "extract the agent map", "generate the build plan", "create the
  agent docs", "what do we build first?"

Do **not** run this skill if `/audit-blueprint` returned `BLOCKED` on the
Downstream Usability dimension — the source data is not reliable enough.

---

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| `docs/blueprints/business-blueprint.json` | **Required** | Must exist and pass usability check |
| `.claude/templates/blueprint-schema.json` | Reference | For field definitions if needed |

**Minimum data requirements in the JSON before extraction:**
- `agents.agent_map` — non-empty array; each entry has `id`, `name`, `role`,
  `status`, `triggers`, `outputs`
- `build_priority` — non-empty array; each entry has `item`, `type`,
  `rationale`, `priority`
- `assumptions` — array (may be empty but must exist)
- `gaps` — array (may be empty but must exist)

If any of these are missing or empty, stop and direct the user to
`/improve-blueprint` to add the missing data first.

---

## Execution Steps

1. **Verify the blueprint exists and is usable.**
   Read `docs/blueprints/business-blueprint.json`.
   Check that `agents.agent_map`, `build_priority`, `assumptions`, and `gaps`
   all exist and are non-empty arrays.
   If not, stop with a specific message naming which section is missing.

2. **Extract and write `agent-map.md`.**
   See Output Spec: Agent Map below.

3. **Extract and write `build-priority.md`.**
   See Output Spec: Build Priority below.

4. **Extract and write `assumptions-and-gaps.md`.**
   See Output Spec: Assumptions and Gaps below.

5. **Confirm completion.**
   Print a summary of what was written:
   - How many agents documented
   - How many build priority items listed
   - How many assumptions and how many gaps (broken down by severity)

6. **Offer next step.**
   - "These files are ready for sprint planning."
   - "Run `/audit-blueprint` again if you update the blueprint later to keep
     these in sync."

---

## Output Spec: Agent Map (`agent-map.md`)

### Structure

```markdown
# Agent Map — [business.name]
> Extracted from business-blueprint.json · [today's date] · Schema [version]

[1-sentence summary of the agent ecosystem — total count, how many live vs planned]

## Agent Ecosystem Diagram

[Mermaid flowchart showing agent relationships]
- Nodes: each agent (styled by status: live=green, in_progress=yellow, planned=grey)
- Edges: depends_on relationships, labelled with direction
- Group client-facing agents separately from internal agents if distinguishable

## Agent Inventory

| ID | Name | Role | Status | Triggers | Key Outputs | Depends On |
|----|------|------|--------|----------|-------------|------------|
[one row per agent, all columns from agent_map[]]

## Agent Details

[One subsection per agent:]
### [agent.name] (`[agent.id]`)
**Status:** [status]
**Role:** [role]
**Triggers:** [triggers as bullet list]
**Inputs:** [inputs as bullet list, or "None specified"]
**Outputs:** [outputs as bullet list]
**Tools:** [tools, or "Not specified"]
**Depends on:** [depends_on IDs, or "None"]
**Powers services:** [services_powered IDs, or "None specified"]
**Definition:** [`[definition_path]`]([definition_path]) or "Not yet created"
```

**Mermaid diagram rules:**
- Use `flowchart TD` (top-down)
- Node ID = agent `id` in camelCase (no hyphens in Mermaid IDs)
- Node label = agent `name`
- Style by status:
  - `live`: `fill:#22c55e,color:#fff`
  - `in_progress`: `fill:#f59e0b,color:#fff`
  - `planned`: `fill:#94a3b8,color:#fff`
  - `deprecated`: `fill:#ef4444,color:#fff`
- Edge label = "depends on" only for `depends_on` relationships
- If `services_powered` is set, show a dashed edge to a Service node

---

## Output Spec: Build Priority (`build-priority.md`)

### Structure

```markdown
# Build Priority — [business.name]
> Extracted from business-blueprint.json · [today's date]

[1-sentence summary: total items, effort distribution, highest-impact item]

## Sprint 1 Recommendation

[Top 3–5 items from build_priority sorted by priority integer where effort is
XS/S/M. These are the items to execute first.]

| # | Item | Type | Effort | Impact | Rationale |
|---|------|------|--------|--------|-----------|
[rows for Sprint 1 items only]

## Full Build Priority

| Priority | Item | Type | Effort | Impact | Rationale | Depends On |
|----------|------|------|--------|--------|-----------|------------|
[all items sorted ascending by priority integer]

## Dependency Order

[If any build_priority items have depends_on set, show a Mermaid diagram
of the dependency chain. Skip this section if no dependencies exist.]
```

**Sprint 1 selection rules:**
- Include items with `priority` 1–5 AND `effort` of `XS`, `S`, or `M`
- If all top-5 items are `L` or `XL`, include the top 3 regardless
- Exclude items whose `depends_on` items are not yet in Sprint 1

---

## Output Spec: Assumptions and Gaps (`assumptions-and-gaps.md`)

### Structure

```markdown
# Assumptions & Gaps — [business.name]
> Extracted from business-blueprint.json · [today's date]

[1-sentence summary: X assumptions (Y validated), Z gaps (W blocking)]

## Blocking Gaps

[List ONLY gaps with severity="blocking", as a highlighted callout block each:
> **[gap.gap]**
> Severity: BLOCKING · Owner: [owner or "Unassigned"] · Resolution: [resolution or "None defined"]
]
[If none, write: "No blocking gaps identified."]

## Assumptions

| # | Assumption | Risk if Wrong | Validation Method | Validated? |
|---|-----------|---------------|-------------------|------------|
[all assumptions, sorted with validated=false first]

## Gaps by Severity

### High
[gaps with severity="high" as bullet list: **[gap]** — Owner: [owner]]

### Medium
[gaps with severity="medium" as bullet list]

### Low
[gaps with severity="low" as bullet list]

## Next Actions on Assumptions

[For every assumption where validated=false AND validation_method is not
"[TO BE CONFIRMED]", produce a one-line action:
- [ ] [validation_method] → validates: "[assumption]"
]
```

---

## Handoff

**No agent invoked.** This skill reads JSON and writes Markdown directly.

If the source data in `business-blueprint.json` is insufficient to produce
any of the three files, stop that file, explain what's missing, and hand off
to `/improve-blueprint` for the specific section.

**Post-run options:**
- → `/audit-blueprint` if the blueprint was recently changed
- → `/improve-blueprint` if any extracted section reveals missing data

---

## Notes

- These files are **derived outputs** — they are regenerated from the JSON
  every time. Do not edit them manually; edit the blueprint JSON instead and
  re-extract.
- If `agents.agent_map` has no `depends_on` relationships set, skip the
  Mermaid diagram in `agent-map.md` and note: "No agent dependencies defined."
- `build-priority.md` Sprint 1 is a recommendation, not a commitment. The user
  may reorder after reading.
- Reusable for any `business_type` — all three output files are derived
  entirely from schema fields that exist for every business type.
