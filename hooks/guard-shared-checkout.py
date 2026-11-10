#!/usr/bin/env python3
"""PreToolUse (Bash) hook: stop a branch switch in a checkout someone else is using.

Several Claude sessions share the clones and worktrees of one repository. A
`git checkout <branch>` run in a checkout another session works in moves that
session's files out from under it, and nothing in git says so. This hook runs
before every Bash call; when the call switches branches or hard-resets, it
looks at the target checkout and denies the call if it is in use.

"In use" means any of:
  - another Claude session started in that checkout
  - a process listening on a TCP port (a dev server, a preview) has its working
    directory there, unless it belongs to this session or to a session already
    reported. Only listeners count: shells, editors and stdio MCP servers also
    sit in a checkout and would bury the signal
  - a rebase, merge or cherry-pick is in progress there
  - for `reset --hard` only: tracked files have uncommitted changes

Guarded commands: git checkout / switch (not the `git checkout <ref> -- <path>`
file-restore form), git reset --hard, gh pr checkout.

Escape hatch: once the user has confirmed, rerun the command prefixed with
`CHECKOUT_GUARD_ACK=1 `. The deny message tells the model it may do so only
after an explicit confirmation from the user.

Output: a JSON permission decision on stdout, exit 0. Any internal error allows
the call (a broken guard must not wedge every Bash command) and says so on stderr.
"""

import json
import os
import re
import subprocess
import sys

ACK_TOKEN = "CHECKOUT_GUARD_ACK=1"
SEGMENT_SPLIT = re.compile(r"&&|\|\||;|\||\n")
LEADING_ENV = re.compile(r"^(?:\s*[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*")
GIT_C_DIR = re.compile(r"""^git\s+-C\s+(?:"([^"]+)"|'([^']+)'|(\S+))""")
CD_DIR = re.compile(r"""^cd\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*$""")
GIT_SUBCOMMAND = re.compile(r"^git(?:\s+-C\s+(?:\"[^\"]+\"|'[^']+'|\S+))?\s+(\S+)(.*)$")
GH_PR_CHECKOUT = re.compile(r"^gh\s+pr\s+checkout\b")
IN_PROGRESS_MARKERS = {
    "rebase-merge": "rebase",
    "rebase-apply": "rebase / am",
    "MERGE_HEAD": "merge",
    "CHERRY_PICK_HEAD": "cherry-pick",
}


def run(args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=10)
    return result.stdout if result.returncode == 0 else ""


def resolve_dir(raw, base):
    path = os.path.expanduser(raw)
    if not os.path.isabs(path):
        path = os.path.join(base, path)
    return os.path.realpath(path)


def first_group(match):
    return next(g for g in match.groups() if g is not None)


def classify(segment):
    """Return 'switch', 'reset-hard' or None for one shell segment."""
    if GH_PR_CHECKOUT.match(segment):
        return "switch"
    match = GIT_SUBCOMMAND.match(segment)
    if not match:
        return None
    sub, rest = match.group(1), match.group(2)
    if sub == "switch":
        return "switch"
    if sub == "checkout":
        # `git checkout [<ref>] -- <path>` restores files; it does not switch.
        return None if re.search(r"(^|\s)--(\s|$)", rest) else "switch"
    if sub == "reset" and re.search(r"(^|\s)--hard(\s|$)", rest):
        return "reset-hard"
    return None


def guarded_targets(command, cwd):
    """Yield (kind, directory) for each guarded segment, tracking `cd` and `-C`."""
    current = cwd
    for raw in SEGMENT_SPLIT.split(command):
        segment = LEADING_ENV.sub("", raw.strip())
        cd = CD_DIR.match(segment)
        if cd:
            current = resolve_dir(first_group(cd), current)
            continue
        kind = classify(segment)
        if not kind:
            continue
        git_c = GIT_C_DIR.match(segment)
        yield kind, resolve_dir(first_group(git_c), current) if git_c else current


def process_table():
    table = {}
    for line in run(["ps", "-Ao", "pid=,ppid=,comm="]).splitlines():
        parts = line.split(None, 2)
        if len(parts) == 3:
            table[int(parts[0])] = (int(parts[1]), os.path.basename(parts[2].strip()))
    return table


def process_cwds():
    cwds, pid = {}, None
    for line in run(["lsof", "-d", "cwd", "-Fpn"]).splitlines():
        if line.startswith("p"):
            pid = int(line[1:])
        elif line.startswith("n") and pid is not None:
            cwds[pid] = os.path.realpath(line[1:])
    return cwds


def listeners():
    ports, pid = {}, None
    for line in run(["lsof", "-nP", "-iTCP", "-sTCP:LISTEN", "-Fpn"]).splitlines():
        if line.startswith("p"):
            pid = int(line[1:])
        elif line.startswith("n") and pid is not None:
            ports.setdefault(pid, set()).add(line[1:].rsplit(":", 1)[-1])
    return ports


def ancestors(pid, table):
    chain, seen = [], set()
    while pid in table and pid not in seen and pid > 1:
        seen.add(pid)
        chain.append(pid)
        pid = table[pid][0]
    return chain


def own_claude_pid(table):
    for pid in ancestors(os.getppid(), table):
        if table[pid][1] == "claude":
            return pid
    return None


def inside(path, root):
    return path == root or path.startswith(root + os.sep)


def occupants(toplevel, table, cwds, ports, me):
    """Other Claude sessions and listening processes whose cwd is inside toplevel."""
    sessions = [
        pid for pid, (_, name) in table.items()
        if name == "claude" and pid != me and inside(cwds.get(pid, ""), toplevel)
    ]
    covered = set(sessions) | ({me} if me else set())
    others = []
    for pid, path in cwds.items():
        if pid in covered or pid not in ports or not inside(path, toplevel) or pid not in table:
            continue
        if covered.intersection(ancestors(pid, table)):
            continue
        cmd = run(["ps", "-o", "command=", "-p", str(pid)]).strip()
        port_list = ",".join(sorted(ports[pid]))
        others.append(f"pid {pid}（port {port_list}）: {cmd[:120]}")
    return sessions, others


def git_state(toplevel, kind):
    problems = []
    git_dir = run(["git", "-C", toplevel, "rev-parse", "--absolute-git-dir"]).strip()
    for marker, label in IN_PROGRESS_MARKERS.items():
        if git_dir and os.path.exists(os.path.join(git_dir, marker)):
            problems.append(f"{label} 正在進行中（{marker}）")
    if kind == "reset-hard":
        dirty = run(["git", "-C", toplevel, "status", "--porcelain", "--untracked-files=no"])
        count = len([l for l in dirty.splitlines() if l.strip()])
        if count:
            problems.append(f"有 {count} 個已追蹤檔案未 commit，reset --hard 會把它們蓋掉")
    return problems


def check(kind, directory, table, cwds, ports, me):
    toplevel = run(["git", "-C", directory, "rev-parse", "--show-toplevel"]).strip()
    if not toplevel:
        return None
    toplevel = os.path.realpath(toplevel)
    sessions, others = occupants(toplevel, table, cwds, ports, me)
    problems = git_state(toplevel, kind)
    if sessions:
        problems.insert(0, f"另有 {len(sessions)} 個 Claude session 在這個 checkout 裡啟動（pid {', '.join(map(str, sessions))}）")
    if others:
        problems.append("有程序在這裡開著 port：\n    " + "\n    ".join(others))
    if not problems:
        return None
    branch = run(["git", "-C", toplevel, "branch", "--show-current"]).strip() or "(detached)"
    return f"{toplevel}（目前 {branch}）：\n  - " + "\n  - ".join(problems)


def decide(reason):
    message = (
        "已擋下切換 branch／reset：目標 checkout 有人在用，或有會被蓋掉的狀態。\n"
        f"{reason}\n"
        "先告訴使用者是誰在用、問要不要繼續；或改在沒人用的 worktree 做。"
        f"只有使用者明確同意後，才可以在指令前加 `{ACK_TOKEN} ` 重跑。"
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": message,
        },
        "systemMessage": message,
    }, ensure_ascii=False))


def main():
    payload = json.load(sys.stdin)
    command = (payload.get("tool_input") or {}).get("command") or ""
    if ACK_TOKEN in command:
        return
    targets = list(guarded_targets(command, payload.get("cwd") or os.getcwd()))
    if not targets:
        return
    table, cwds, ports = process_table(), process_cwds(), listeners()
    me = own_claude_pid(table)
    reasons = [r for kind, d in targets if (r := check(kind, d, table, cwds, ports, me))]
    if reasons:
        decide("\n".join(reasons))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # a broken guard must not block every Bash call
        print(f"guard-shared-checkout: skipped, internal error: {error}", file=sys.stderr)
    sys.exit(0)
