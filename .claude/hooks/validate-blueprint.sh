#!/usr/bin/env bash
# =============================================================================
# validate-blueprint.sh
# Blueprint structural validation hook for the Blueprint Agent system.
#
# PURPOSE:
#   Fast, pre-flight structural check of business-blueprint.json.
#   Checks that all critical top-level sections and key fields are present
#   and non-empty. Does NOT perform semantic or logical validation — that is
#   the job of the blueprint-validator agent.
#
# USAGE:
#   ./validate-blueprint.sh [path/to/business-blueprint.json]
#   If no path is given, defaults to docs/blueprints/business-blueprint.json
#
# EXIT CODES:
#   0 — All critical checks passed (may still have warnings)
#   1 — One or more critical checks failed
#   2 — Prerequisites not met (jq missing, file not found)
#
# INTEGRATION:
#   Add to Claude Code hooks to run automatically after blueprint writes.
#   Can also be run manually or in CI.
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
fail()  { echo -e "${RED}  ✗ FAIL${RESET}  $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
warn()  { echo -e "${YELLOW}  ⚠ WARN${RESET}  $*"; WARN_COUNT=$((WARN_COUNT + 1)); }
pass()  { echo -e "${GREEN}  ✓ PASS${RESET}  $*"; }
info()  { echo -e "${CYAN}  →${RESET} $*"; }
header(){ echo -e "\n${BOLD}$*${RESET}"; }

FAIL_COUNT=0
WARN_COUNT=0

# ── Resolve blueprint path ────────────────────────────────────────────────────
BLUEPRINT_PATH="${1:-docs/blueprints/business-blueprint.json}"

echo -e "${BOLD}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " BLUEPRINT STRUCTURAL VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${RESET}"
info "Blueprint: $BLUEPRINT_PATH"
info "Run at:    $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# ── Prerequisite: jq ─────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo -e "${RED}FATAL: jq is required but not installed.${RESET}"
  echo "       Install with: apt-get install jq  |  brew install jq"
  exit 2
fi

# ── Prerequisite: file exists and is valid JSON ───────────────────────────────
if [[ ! -f "$BLUEPRINT_PATH" ]]; then
  echo -e "${RED}FATAL: Blueprint file not found: $BLUEPRINT_PATH${RESET}"
  echo "       Run blueprint-agent in CREATE mode first."
  exit 2
fi

if ! jq empty "$BLUEPRINT_PATH" 2>/dev/null; then
  echo -e "${RED}FATAL: Blueprint file contains invalid JSON.${RESET}"
  exit 2
fi

BP="$BLUEPRINT_PATH"

# ── Helper: jq field extractor ────────────────────────────────────────────────
# Returns the value or empty string if null/missing
jq_val() { jq -r "${1} // empty" "$BP" 2>/dev/null || true; }

# Returns "true" if the jq query result is a non-empty array
jq_array_nonempty() {
  local len
  len=$(jq "${1} | if type == \"array\" then length else 0 end" "$BP" 2>/dev/null || echo 0)
  [[ "$len" -gt 0 ]]
}

# Returns "true" if value is non-empty and not a known placeholder
is_real_value() {
  local val="$1"
  if [[ -z "$val" ]]; then return 1; fi
  case "$val" in
    ""|"null"|"[TO BE CONFIRMED]"|"TBD"|"TODO"|"Placeholder"|"N/A"|"n/a")
      return 1 ;;
    *)
      return 0 ;;
  esac
}

# ── SECTION 1: Meta ───────────────────────────────────────────────────────────
header "1. META"

SCHEMA_VERSION=$(jq_val '.meta.schema_version')
BUSINESS_TYPE=$(jq_val '.meta.business_type')
STATUS=$(jq_val '.meta.status')
CREATED_AT=$(jq_val '.meta.created_at')
UPDATED_AT=$(jq_val '.meta.last_updated_at')

is_real_value "$SCHEMA_VERSION" && pass "meta.schema_version = $SCHEMA_VERSION" \
  || fail "meta.schema_version is missing or placeholder"

is_real_value "$BUSINESS_TYPE" && pass "meta.business_type = $BUSINESS_TYPE" \
  || fail "meta.business_type is missing or placeholder"

is_real_value "$STATUS" && pass "meta.status = $STATUS" \
  || fail "meta.status is missing or placeholder"

is_real_value "$CREATED_AT" && pass "meta.created_at = $CREATED_AT" \
  || fail "meta.created_at is missing or placeholder"

is_real_value "$UPDATED_AT" && pass "meta.last_updated_at = $UPDATED_AT" \
  || warn "meta.last_updated_at is missing — blueprint may be stale"

# ── SECTION 2: Business ───────────────────────────────────────────────────────
header "2. BUSINESS IDENTITY"

BIZ_NAME=$(jq_val '.business.name')
BIZ_DESC=$(jq_val '.business.description')
BIZ_STAGE=$(jq_val '.business.stage')

is_real_value "$BIZ_NAME" && pass "business.name = $BIZ_NAME" \
  || fail "business.name is missing or placeholder"

is_real_value "$BIZ_DESC" && pass "business.description present" \
  || fail "business.description is missing or placeholder"

is_real_value "$BIZ_STAGE" && pass "business.stage = $BIZ_STAGE" \
  || fail "business.stage is missing or placeholder"

# Description length check
DESC_WORDS=$(echo "$BIZ_DESC" | wc -w | tr -d ' ')
if [[ "$DESC_WORDS" -lt 15 ]]; then
  warn "business.description is very short ($DESC_WORDS words) — expand to 2–4 sentences"
fi

# ── SECTION 3: Market ─────────────────────────────────────────────────────────
header "3. MARKET & ICP"

jq_array_nonempty '.market.target_segments' \
  && pass "market.target_segments has entries" \
  || fail "market.target_segments is missing or empty"

ICP_DESC=$(jq_val '.market.icp.description')
ICP_ROLE=$(jq_val '.market.icp.role')
ICP_SIZE=$(jq_val '.market.icp.company_size')

is_real_value "$ICP_DESC" && pass "market.icp.description present" \
  || fail "market.icp.description is missing or placeholder"

is_real_value "$ICP_ROLE" && pass "market.icp.role = $ICP_ROLE" \
  || warn "market.icp.role is missing — outreach copy will be generic"

is_real_value "$ICP_SIZE" && pass "market.icp.company_size = $ICP_SIZE" \
  || warn "market.icp.company_size is missing — targeting will be vague"

TRIGGER_COUNT=$(jq '.market.icp.trigger_events | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)
if [[ "$TRIGGER_COUNT" -ge 1 ]]; then
  pass "market.icp.trigger_events has $TRIGGER_COUNT entr$([ "$TRIGGER_COUNT" -eq 1 ] && echo y || echo ies)"
else
  fail "market.icp.trigger_events is missing or empty — required for outreach targeting"
fi

PAIN_COUNT=$(jq '.market.pain_points | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)
[[ "$PAIN_COUNT" -ge 1 ]] \
  && pass "market.pain_points has $PAIN_COUNT entr$([ "$PAIN_COUNT" -eq 1 ] && echo y || echo ies)" \
  || fail "market.pain_points is missing or empty"

# ── SECTION 4: Services ───────────────────────────────────────────────────────
header "4. SERVICES"

SERVICE_COUNT=$(jq '.services | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)
if [[ "$SERVICE_COUNT" -ge 1 ]]; then
  pass "services has $SERVICE_COUNT entr$([ "$SERVICE_COUNT" -eq 1 ] && echo y || echo ies)"
else
  fail "services is missing or empty — at least one service is required"
fi

# Check each service for required fields
SERVICES_WITH_ISSUES=0
for i in $(seq 0 $((SERVICE_COUNT - 1))); do
  SVC_ID=$(jq_val ".services[$i].id")
  SVC_NAME=$(jq_val ".services[$i].name")
  SVC_DESC=$(jq_val ".services[$i].description")
  SVC_TYPE=$(jq_val ".services[$i].delivery_type")
  SVC_INPUTS=$(jq ".services[$i].inputs | if type==\"array\" then length else 0 end" "$BP" 2>/dev/null || echo 0)
  SVC_OUTPUTS=$(jq ".services[$i].outputs | if type==\"array\" then length else 0 end" "$BP" 2>/dev/null || echo 0)

  LABEL="${SVC_NAME:-service[$i]}"
  SVC_FAIL=0

  is_real_value "$SVC_ID"   || { fail "services[$i] ($LABEL): id is missing"; SVC_FAIL=1; }
  is_real_value "$SVC_NAME" || { fail "services[$i]: name is missing"; SVC_FAIL=1; }
  is_real_value "$SVC_DESC" || { fail "services[$i] ($LABEL): description is missing"; SVC_FAIL=1; }
  is_real_value "$SVC_TYPE" || { fail "services[$i] ($LABEL): delivery_type is missing"; SVC_FAIL=1; }
  [[ "$SVC_INPUTS"  -ge 1 ]] || { fail "services[$i] ($LABEL): inputs array is empty"; SVC_FAIL=1; }
  [[ "$SVC_OUTPUTS" -ge 1 ]] || { fail "services[$i] ($LABEL): outputs array is empty"; SVC_FAIL=1; }

  [[ "$SVC_FAIL" -eq 0 ]] && pass "services[$i] ($LABEL): all required fields present"
  SERVICES_WITH_ISSUES=$((SERVICES_WITH_ISSUES + SVC_FAIL))
done

# ── SECTION 5: Value Proposition ──────────────────────────────────────────────
header "5. VALUE PROPOSITION"

VP_HEADLINE=$(jq_val '.value_proposition.headline')
is_real_value "$VP_HEADLINE" && pass "value_proposition.headline present" \
  || fail "value_proposition.headline is missing or placeholder"

DIFF_COUNT=$(jq '.value_proposition.differentiators | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)
if [[ "$DIFF_COUNT" -ge 2 ]]; then
  pass "value_proposition.differentiators has $DIFF_COUNT entries"
elif [[ "$DIFF_COUNT" -eq 1 ]]; then
  warn "value_proposition.differentiators has only 1 entry — recommend at least 3"
else
  fail "value_proposition.differentiators is missing or empty"
fi

# ── SECTION 6: Tech Stack ─────────────────────────────────────────────────────
header "6. TECH STACK"

LLM=$(jq_val '.tech_stack.primary_llm')
ORCH=$(jq_val '.tech_stack.orchestration')

is_real_value "$LLM"  && pass "tech_stack.primary_llm = $LLM" \
  || fail "tech_stack.primary_llm is missing — critical for AI automation agency"

is_real_value "$ORCH" && pass "tech_stack.orchestration = $ORCH" \
  || fail "tech_stack.orchestration is missing — critical for AI automation agency"

# ── SECTION 7: Pricing ────────────────────────────────────────────────────────
header "7. PRICING"

PRICING_MODEL=$(jq_val '.pricing.model')
TIER_COUNT=$(jq '.pricing.tiers | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)

is_real_value "$PRICING_MODEL" && pass "pricing.model = $PRICING_MODEL" \
  || fail "pricing.model is missing"

if [[ "$TIER_COUNT" -ge 1 ]]; then
  pass "pricing.tiers has $TIER_COUNT tier$([ "$TIER_COUNT" -eq 1 ] && echo '' || echo s)"
else
  fail "pricing.tiers is missing or empty"
fi

# Validate each tier has required fields
for i in $(seq 0 $((TIER_COUNT - 1))); do
  TIER_ID=$(jq_val ".pricing.tiers[$i].id")
  TIER_NAME=$(jq_val ".pricing.tiers[$i].name")
  TIER_PRICE=$(jq_val ".pricing.tiers[$i].price")
  INCL_COUNT=$(jq ".pricing.tiers[$i].inclusions | if type==\"array\" then length else 0 end" "$BP" 2>/dev/null || echo 0)

  LABEL="${TIER_NAME:-tier[$i]}"
  is_real_value "$TIER_ID"    || fail "pricing.tiers[$i] ($LABEL): id is missing"
  is_real_value "$TIER_PRICE" || fail "pricing.tiers[$i] ($LABEL): price is missing"
  [[ "$INCL_COUNT" -ge 1 ]]   || warn "pricing.tiers[$i] ($LABEL): inclusions is empty"
done

# ── SECTION 8: Team ───────────────────────────────────────────────────────────
header "8. TEAM"

HEADCOUNT=$(jq_val '.team.current_headcount')
ROLE_COUNT=$(jq '.team.roles | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)

is_real_value "$HEADCOUNT" && pass "team.current_headcount = $HEADCOUNT" \
  || fail "team.current_headcount is missing"

[[ "$ROLE_COUNT" -ge 1 ]] \
  && pass "team.roles has $ROLE_COUNT entr$([ "$ROLE_COUNT" -eq 1 ] && echo y || echo ies)" \
  || fail "team.roles is missing or empty"

# ── SECTION 9: Agent Map ──────────────────────────────────────────────────────
header "9. AGENT MAP"

AGENT_COUNT=$(jq '.agents.agent_map | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)

if [[ "$AGENT_COUNT" -ge 1 ]]; then
  pass "agents.agent_map has $AGENT_COUNT agent$([ "$AGENT_COUNT" -eq 1 ] && echo '' || echo s)"
else
  fail "agents.agent_map is missing or empty — required for downstream agent scaffolding"
fi

[[ "$AGENT_COUNT" -ge 3 ]] \
  || warn "agents.agent_map has fewer than 3 agents — minimum viable ecosystem is 3"

# Check each agent for required fields
for i in $(seq 0 $((AGENT_COUNT - 1))); do
  AGT_ID=$(jq_val ".agents.agent_map[$i].id")
  AGT_NAME=$(jq_val ".agents.agent_map[$i].name")
  AGT_ROLE=$(jq_val ".agents.agent_map[$i].role")
  AGT_STATUS=$(jq_val ".agents.agent_map[$i].status")
  AGT_TRIGGERS=$(jq ".agents.agent_map[$i].triggers | if type==\"array\" then length else 0 end" "$BP" 2>/dev/null || echo 0)
  AGT_OUTPUTS=$(jq ".agents.agent_map[$i].outputs | if type==\"array\" then length else 0 end" "$BP" 2>/dev/null || echo 0)

  LABEL="${AGT_NAME:-agent[$i]}"
  is_real_value "$AGT_ID"     || fail "agents.agent_map[$i] ($LABEL): id is missing"
  is_real_value "$AGT_ROLE"   || fail "agents.agent_map[$i] ($LABEL): role is missing"
  is_real_value "$AGT_STATUS" || fail "agents.agent_map[$i] ($LABEL): status is missing"
  [[ "$AGT_TRIGGERS" -ge 1 ]] || warn "agents.agent_map[$i] ($LABEL): triggers is empty"
  [[ "$AGT_OUTPUTS"  -ge 1 ]] || fail "agents.agent_map[$i] ($LABEL): outputs is empty"
done

# ── SECTION 10: KPIs ─────────────────────────────────────────────────────────
header "10. KPIs"

for kpi_type in operational financial client_success; do
  COUNT=$(jq ".kpis.${kpi_type} | if type==\"array\" then length else 0 end" "$BP" 2>/dev/null || echo 0)
  [[ "$COUNT" -ge 1 ]] \
    && pass "kpis.$kpi_type has $COUNT entr$([ "$COUNT" -eq 1 ] && echo y || echo ies)" \
    || fail "kpis.$kpi_type is missing or empty"
done

# ── SECTION 11: Assumptions ───────────────────────────────────────────────────
header "11. ASSUMPTIONS & GAPS"

ASSUMP_COUNT=$(jq '.assumptions | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)
[[ "$ASSUMP_COUNT" -ge 1 ]] \
  && pass "assumptions has $ASSUMP_COUNT entr$([ "$ASSUMP_COUNT" -eq 1 ] && echo y || echo ies)" \
  || fail "assumptions is missing or empty — every early-stage business has assumptions"

GAP_COUNT=$(jq '.gaps | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)
[[ "$GAP_COUNT" -ge 0 ]] && pass "gaps section present ($GAP_COUNT gaps listed)"

# Check for blocking gaps
BLOCKING=$(jq '[.gaps[] | select(.severity=="blocking")] | length' "$BP" 2>/dev/null || echo 0)
if [[ "$BLOCKING" -gt 0 ]]; then
  warn "$BLOCKING blocking gap$([ "$BLOCKING" -eq 1 ] && echo '' || echo s) identified — review before promoting blueprint"
fi

# ── SECTION 12: Build Priority ────────────────────────────────────────────────
header "12. BUILD PRIORITY"

BP_COUNT=$(jq '.build_priority | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)

if [[ "$BP_COUNT" -ge 2 ]]; then
  pass "build_priority has $BP_COUNT items"
elif [[ "$BP_COUNT" -eq 1 ]]; then
  warn "build_priority has only 1 item — add more to support sprint planning"
else
  fail "build_priority is missing or empty — required for downstream sprint planning"
fi

for i in $(seq 0 $((BP_COUNT - 1))); do
  ITEM_NAME=$(jq_val ".build_priority[$i].item")
  ITEM_TYPE=$(jq_val ".build_priority[$i].type")
  ITEM_RAT=$(jq_val ".build_priority[$i].rationale")

  LABEL="${ITEM_NAME:-item[$i]}"
  is_real_value "$ITEM_NAME" || fail "build_priority[$i]: item name is missing"
  is_real_value "$ITEM_TYPE" || warn  "build_priority[$i] ($LABEL): type is missing"
  is_real_value "$ITEM_RAT"  || fail "build_priority[$i] ($LABEL): rationale is missing — required"
done

# ── Cross-check: service pricing_refs ────────────────────────────────────────
header "CROSS-CHECKS"

# Collect all tier IDs
TIER_IDS=$(jq -r '[.pricing.tiers[].id] | join(" ")' "$BP" 2>/dev/null || true)

# Check each service pricing_ref
SERVICE_COUNT_RECHECK=$(jq '.services | if type=="array" then length else 0 end' "$BP" 2>/dev/null || echo 0)
for i in $(seq 0 $((SERVICE_COUNT_RECHECK - 1))); do
  REF=$(jq_val ".services[$i].pricing_ref")
  SVC_NAME=$(jq_val ".services[$i].name")
  if is_real_value "$REF"; then
    if echo "$TIER_IDS" | grep -qw "$REF"; then
      pass "services[$i] ($SVC_NAME): pricing_ref '$REF' matches a known tier"
    else
      fail "services[$i] ($SVC_NAME): pricing_ref '$REF' does not match any tier in pricing.tiers"
    fi
  fi
done

# Check agent_dependencies exist in agent_map
AGENT_IDS=$(jq -r '[.agents.agent_map[].id] | join(" ")' "$BP" 2>/dev/null || true)
for i in $(seq 0 $((SERVICE_COUNT_RECHECK - 1))); do
  SVC_NAME=$(jq_val ".services[$i].name")
  DEP_COUNT=$(jq ".services[$i].agent_dependencies | if type==\"array\" then length else 0 end" "$BP" 2>/dev/null || echo 0)
  for j in $(seq 0 $((DEP_COUNT - 1))); do
    DEP_ID=$(jq_val ".services[$i].agent_dependencies[$j]")
    if is_real_value "$DEP_ID"; then
      if echo "$AGENT_IDS" | grep -qw "$DEP_ID"; then
        pass "services[$i] ($SVC_NAME): agent_dependency '$DEP_ID' exists in agent_map"
      else
        fail "services[$i] ($SVC_NAME): agent_dependency '$DEP_ID' not found in agents.agent_map"
      fi
    fi
  done
done

# ── Final Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD} RESULT SUMMARY${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

if [[ "$FAIL_COUNT" -eq 0 && "$WARN_COUNT" -eq 0 ]]; then
  echo -e " ${GREEN}${BOLD}✓ ALL CHECKS PASSED${RESET}"
  echo "  Blueprint is structurally valid and ready for semantic validation."
  echo ""
  echo "  Next: run blueprint-validator agent for deep quality checks."
elif [[ "$FAIL_COUNT" -eq 0 ]]; then
  echo -e " ${YELLOW}${BOLD}⚠ PASSED WITH WARNINGS${RESET}"
  echo "  FAILs: $FAIL_COUNT   WARNs: $WARN_COUNT"
  echo ""
  echo "  Blueprint passes structural checks but has quality gaps."
  echo "  Recommend fixing warnings before promoting to 'approved'."
else
  echo -e " ${RED}${BOLD}✗ VALIDATION FAILED${RESET}"
  echo "  FAILs: $FAIL_COUNT   WARNs: $WARN_COUNT"
  echo ""
  echo "  Blueprint has critical structural issues."
  echo "  Run blueprint-agent in IMPROVE mode to fix the failures listed above."
fi

echo ""
[[ "$FAIL_COUNT" -gt 0 ]] && exit 1 || exit 0
