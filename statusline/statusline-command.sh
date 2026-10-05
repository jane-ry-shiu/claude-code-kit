#!/usr/bin/env bash
# Claude Code statusLine — two-line layout (Nerd Font icons, MesloLGS NF)
#   Line 1:  dir |  branch[* dirty] |  session cost
#   Line 2: model | effort |  context bar |  7d% |  5h% ↻reset-HH:MM
#
# Percentage semantics = USED capacity (how much you have consumed):
#   <= 50%  green   safe
#   51-79%  yellow  caution, wrap up / prepare to switch session
#   >= 80%  red     danger, deal with it now
# context uses context_window.used_percentage; rate_limits use used_percentage.
# Icons are monochrome Nerd Font glyphs, so they inherit each segment's color.
# Glyphs are embedded as raw UTF-8 bytes via printf (bash 3.2 compatible).

input=$(cat)

# --- Claude Code fields ---
cwd=$(echo "$input" | jq -r '.cwd // empty')
model=$(echo "$input" | jq -r '.model.display_name // empty')
effort_level=$(echo "$input" | jq -r '.effort.level // empty')
cost_usd=$(echo "$input" | jq -r '.cost.total_cost_usd // empty')
ctx_used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
rate_5h_used=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
rate_7d_used=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
rate_5h_reset=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')

# --- Colors (ANSI) ---
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
MAGENTA='\033[38;2;160;158;226m'  # model — blue-violet 藍紫 (less red) #a09ee2
GRAY='\033[90m'
MIDGRAY='\033[38;5;246m'  # 256-color gray, between 90m (dark) and 37m (light)
WORKTREE='\033[38;2;235;175;95m'  # linked-worktree dir label — warm amber #ebaf5f (bright, readable on dark)
# Morandi (莫蘭迪) usage colors for context bar + rate-limit % — low-saturation,
# grayed "muddy" tones (truecolor 24-bit). ONLY these usage levels are Morandi;
# every other segment keeps its original color.
SOFT_GREEN='\033[38;2;180;200;142m'  # <=50%   muddy sage       #b4c88e
SOFT_YELLOW='\033[38;2;225;205;135m' # 51-79%  muddy gold       #e1cd87
SOFT_RED='\033[38;2;222;148;132m'    # >=80%   dusty terracotta #de9484

# --- Icons (Nerd Font glyphs as raw UTF-8 bytes) ---
ICON_DIR=$(printf '\xef\x81\xbb')     # U+F07B nf-fa-folder
ICON_BRANCH=$(printf '\xee\x82\xa0')  # U+E0A0 powerline git branch
ICON_COST=$(printf '\xef\x85\x95')    # U+F155 nf-fa-dollar
ICON_CTX=$(printf '\xef\x8b\x9b')     # U+F2DB nf-fa-microchip (context window)
ICON_RATE=$(printf '\xef\x80\x97')    # U+F017 nf-fa-clock_o (rate limit windows)
SYM_RESET=$(printf '\xe2\x86\xbb')    # U+21BB clockwise arrow (rate reset time)

# --- Helper: color for a USED percentage (integer) ---
pct_color() {
  local p=$1
  if [ "$p" -le 50 ]; then
    printf '%b' "$SOFT_GREEN"
  elif [ "$p" -le 79 ]; then
    printf '%b' "$SOFT_YELLOW"
  else
    printf '%b' "$SOFT_RED"
  fi
}

# --- Helper: join args with a dim " | " separator ---
SEP=" $(printf "${DIM}|${RESET}") "
join_parts() {
  local out="" p
  for p in "$@"; do
    if [ -z "$out" ]; then out="$p"; else out="${out}${SEP}${p}"; fi
  done
  printf '%s' "$out"
}

# --- Directory (shorten $HOME to ~) ---
dir="${cwd/#$HOME/~}"

# --- Git branch + worktree label ---
# Always resolve the REAL branch name from git (symbolic-ref), never the
# worktree DIRECTORY name — using the dir name would mask the actual branch.
# For LINKED worktrees we additionally surface the worktree dir name so sibling
# checkouts of the same repo stay distinguishable (e.g. clone-name:branch).
branch=""
worktree_name=""
git_dirty=""
if [ -n "$cwd" ] && git -C "$cwd" --no-optional-locks rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null \
           || git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
  # Linked worktrees live under <repo>/.git/worktrees/<name>; the primary
  # checkout's git-dir is a plain ".git", so it gets no worktree prefix.
  gitdir=$(git -C "$cwd" --no-optional-locks rev-parse --git-dir 2>/dev/null)
  case "$gitdir" in
    */worktrees/*)
      toplevel=$(git -C "$cwd" --no-optional-locks rev-parse --show-toplevel 2>/dev/null)
      [ -n "$toplevel" ] && worktree_name=$(basename "$toplevel")
      ;;
  esac
  if [ -n "$(git -C "$cwd" --no-optional-locks status --porcelain 2>/dev/null)" ]; then
    git_dirty="✱"
  fi
fi

# ===== Line 1: dir | branch | cost =====
line1=()
line1+=("$(printf "${BOLD}${CYAN}%s %s${RESET}" "$ICON_DIR" "$dir")")

if [ -n "$branch" ]; then
  # Linked worktree → amber "name:" prefix + green branch; else just green branch
  if [ -n "$worktree_name" ]; then
    branch_txt=$(printf "${WORKTREE}%s %s:${RESET}${GREEN}%s${RESET}" "$ICON_BRANCH" "$worktree_name" "$branch")
  else
    branch_txt=$(printf "${GREEN}%s %s${RESET}" "$ICON_BRANCH" "$branch")
  fi
  if [ -n "$git_dirty" ]; then
    branch_txt="${branch_txt} $(printf "${YELLOW}%s${RESET}" "$git_dirty")"
  fi
  line1+=("$branch_txt")
fi

if [ -n "$cost_usd" ]; then
  cost_fmt=$(printf '%.2f' "$cost_usd")
  line1+=("$(printf "${MIDGRAY}%s \$%s${RESET}" "$ICON_COST" "$cost_fmt")")
fi

# ===== Line 2: model | effort | context | rate =====
line2=()

if [ -n "$model" ]; then
  line2+=("$(printf "${MAGENTA}%s${RESET}" "$model")")
fi

# Effort: medium gray (no icon) — readable, between dark gray and light
if [ -n "$effort_level" ]; then
  line2+=("$(printf "${MIDGRAY}effort:%s${RESET}" "$effort_level")")
fi

# Context: thin single-line bar, filled = used, colored by used; no brackets
if [ -n "$ctx_used" ]; then
  cu=$(printf '%.0f' "$ctx_used")
  [ "$cu" -lt 0 ] && cu=0
  [ "$cu" -gt 100 ] && cu=100
  filled=$(( (cu + 5) / 10 ))
  [ "$filled" -gt 10 ] && filled=10
  [ "$filled" -lt 0 ] && filled=0
  empty=$(( 10 - filled ))
  bar_filled=""
  bar_empty=""
  for ((i = 0; i < filled; i++)); do bar_filled+="━"; done
  for ((i = 0; i < empty; i++)); do bar_empty+="─"; done
  cc=$(pct_color "$cu")
  line2+=("$(printf "${cc}%s %s${RESET}${DIM}%s${RESET} ${cc}%s%%${RESET}" \
            "$ICON_CTX" "$bar_filled" "$bar_empty" "$cu")")
fi

# Rate limits: 7d and 5h as SEPARATE segments, each colored by its own used%.
# 5h also shows its reset time point (HH:MM).
if [ -n "$rate_7d_used" ]; then
  u7=$(printf '%.0f' "$rate_7d_used")
  c7=$(pct_color "$u7")
  line2+=("$(printf "${c7}%s 7d:%s%%${RESET}" "$ICON_RATE" "$u7")")
fi
if [ -n "$rate_5h_used" ]; then
  u5=$(printf '%.0f' "$rate_5h_used")
  c5=$(pct_color "$u5")
  reset5=""
  if [ -n "$rate_5h_reset" ]; then
    reset5=$(date -r "$rate_5h_reset" "+%H:%M" 2>/dev/null)
  fi
  if [ -n "$reset5" ]; then
    line2+=("$(printf "${c5}%s 5h:%s%%${RESET} ${MIDGRAY}%s%s${RESET}" "$ICON_RATE" "$u5" "$SYM_RESET" "$reset5")")
  else
    line2+=("$(printf "${c5}%s 5h:%s%%${RESET}" "$ICON_RATE" "$u5")")
  fi
fi

# --- Output (two lines) ---
printf "%s\n" "$(join_parts "${line1[@]}")"
printf "%s\n" "$(join_parts "${line2[@]}")"
