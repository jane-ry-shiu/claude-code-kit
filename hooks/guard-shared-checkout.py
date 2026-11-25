#!/usr/bin/env python3
"""PreToolUse (Bash) hook: guard `git reset --hard`, and report who a branch switch affects.

Several Claude sessions share the clones and worktrees of one repository. This
hook runs before every Bash call and looks at the target checkout of a branch
switch or a hard reset.

Branch switches are never denied: the user decided that a switch they ask for,
or one a review flow needs, goes ahead in place unless they say otherwise. When
the checkout is in use the hook only shows a notice naming who is affected.
`git reset --hard` is denied when the checkout is in use as defined below.

"In use" means any of:
  - another Claude session started in that checkout is working: its status in
    ~/.claude/sessions/<pid>.json is not "idle", or it still has a shell child
    (a background Bash or Monitor task). An idle session with no shell child
    is only open, not working, and does not block. A session whose status
    file cannot be read counts as working. A session that is only responding
    (no background shell) passes by itself: the hook waits up to WAIT_SECONDS
    (kept under the hook timeout) for it to go idle, then denies with an
    instruction to wait for idle and retry instead of asking the user. Every
    deny names each session by its name, terminal and start time, not a bare pid
  - a process listening on a TCP port (a dev server, a preview) has its working
    directory there, unless it belongs to this session or to a session already
    reported. Only listeners count: shells, editors and stdio MCP servers also
    sit in a checkout and would bury the signal
  - a rebase, merge or cherry-pick is in progress there
  - for `reset --hard` only: tracked files have uncommitted changes

Inspected commands: git checkout / switch (not the `git checkout <ref> -- <path>`
file-restore form) and gh pr checkout, which only get a notice; git reset --hard,
which can be denied.

Escape hatch for a denied reset: once the user has confirmed, rerun the command prefixed with
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
import time

ACK_TOKEN = "CHECKOUT_GUARD_ACK=1"
SEGMENT_SPLIT = re.compile(r"&&|\|\||;|\||\n")
LEADING_ENV = re.compile(r"^(?:\s*[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*")
GIT_C_DIR = re.compile(r"""^git\s+-C\s+(?:"([^"]+)"|'([^']+)'|(\S+))""")
CD_DIR = re.compile(r"""^cd\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*$""")
GIT_SUBCOMMAND = re.compile(r"^git(?:\s+-C\s+(?:\"[^\"]+\"|'[^']+'|\S+))?\s+(\S+)(.*)$")
GH_PR_CHECKOUT = re.compile(r"^gh\s+pr\s+checkout\b")
SESSIONS_DIR = os.path.expanduser("~/.claude/sessions")
SHELL_NAMES = {"zsh", "bash", "sh", "fish", "dash"}
WAIT_SECONDS = 10
POLL_SECONDS = 2
RESPONDING_PATIENCE_MINUTES = 5
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


def session_record(pid):
    path = os.path.join(SESSIONS_DIR, f"{pid}.json")
    try:
        with open(path, encoding="utf-8") as handle:
            record = json.load(handle)
    except (OSError, ValueError):
        return None
    return record if record.get("pid") == pid else None


def background_shells(pid, table):
    return [
        child for child, (parent, name) in table.items()
        if parent == pid and name in SHELL_NAMES
    ]


def identify(pid, record):
    tty = run(["ps", "-o", "tty=", "-p", str(pid)]).strip() or "?"
    if not record:
        return f"pid {pid}（終端 {tty}）"
    started = time.strftime("%m/%d %H:%M", time.localtime(record.get("startedAt", 0) / 1000))
    return f"{record.get('name', '?')}（pid {pid}，終端 {tty}，{started} 開的）"


def activity(pid, table):
    """(why a Claude session counts as working, whether it will pass by itself), or None when idle."""
    record = session_record(pid)
    status = record.get("status") if record else None
    shells = background_shells(pid, table)
    if status == "idle" and not shells:
        return None
    who = identify(pid, record)
    if shells:
        return f"{who}：有 {len(shells)} 個背景指令在跑（pid {', '.join(map(str, shells))}）", False
    if status is None:
        return f"{who}：讀不到 session 狀態，當作使用中", False
    return f"{who}：正在回應（{status}）", True


def occupants(toplevel, table, cwds, ports, me):
    """Working Claude sessions and listening processes whose cwd is inside toplevel."""
    present = [
        pid for pid, (_, name) in table.items()
        if name == "claude" and pid != me and inside(cwds.get(pid, ""), toplevel)
    ]
    sessions = [found for pid in present if (found := activity(pid, table))]
    covered = set(present) | ({me} if me else set())
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
    """(reason, passes by itself) for one target, or None when it is free."""
    toplevel = run(["git", "-C", directory, "rev-parse", "--show-toplevel"]).strip()
    if not toplevel:
        return None
    toplevel = os.path.realpath(toplevel)
    sessions, others = occupants(toplevel, table, cwds, ports, me)
    problems = git_state(toplevel, kind)
    transient = not problems and not others and all(passes for _, passes in sessions)
    if sessions:
        lines = "\n    ".join(text for text, _ in sessions)
        problems.insert(0, f"另有 {len(sessions)} 個 Claude session 在這個 checkout 裡工作中：\n    {lines}")
    if others:
        problems.append("有程序在這裡開著 port：\n    " + "\n    ".join(others))
    if not problems:
        return None
    branch = run(["git", "-C", toplevel, "branch", "--show-current"]).strip() or "(detached)"
    return f"{toplevel}（目前 {branch}）：\n  - " + "\n  - ".join(problems), transient


def decide(reason, waited):
    if waited:
        advice = (
            f"已等 {WAIT_SECONDS} 秒，對方還在回應。它沒有背景指令，這只是暫時的："
            "不要問使用者，也不要繞過。用 Monitor 等上面那些 pid 的 "
            f"{SESSIONS_DIR}/<pid>.json 的 status 變成 idle，再重跑同一個指令；"
            f"等超過 {RESPONDING_PATIENCE_MINUTES} 分鐘還在回應，才告訴使用者是哪個 session、問要不要繼續。"
        )
    else:
        advice = (
            "先告訴使用者是哪個 session 在用、問要不要繼續。不要自己另開 worktree 繞過，除非使用者要求。"
            f"只有使用者明確同意後，才可以在指令前加 `{ACK_TOKEN} ` 重跑。"
        )
    message = (
        "已擋下切換 branch／reset：目標 checkout 有人在用，或有會被蓋掉的狀態。\n"
        f"{reason}\n{advice}"
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": message,
        },
        "systemMessage": message,
    }, ensure_ascii=False))


def evaluate(targets):
    table, cwds, ports = process_table(), process_cwds(), listeners()
    me = own_claude_pid(table)
    return [found for kind, d in targets if (found := check(kind, d, table, cwds, ports, me))]


def wait_for_responding_sessions(targets, found):
    deadline = time.monotonic() + WAIT_SECONDS
    while found and all(passes for _, passes in found) and time.monotonic() < deadline:
        time.sleep(POLL_SECONDS)
        found = evaluate(targets)
    return found


def notify_switch(reason):
    message = f"切換 branch 照常執行（不擋）。提醒：\n{reason}"
    print(json.dumps({"systemMessage": message}, ensure_ascii=False))


def main():
    payload = json.load(sys.stdin)
    command = (payload.get("tool_input") or {}).get("command") or ""
    if ACK_TOKEN in command:
        return
    targets = list(guarded_targets(command, payload.get("cwd") or os.getcwd()))
    resets = [t for t in targets if t[0] == "reset-hard"]
    if resets:
        found = wait_for_responding_sessions(resets, evaluate(resets))
        if found:
            decide("\n".join(reason for reason, _ in found), all(passes for _, passes in found))
            return
    switches = [t for t in targets if t[0] == "switch"]
    found = evaluate(switches) if switches else []
    if found:
        notify_switch("\n".join(reason for reason, _ in found))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # a broken guard must not block every Bash call
        print(f"guard-shared-checkout: skipped, internal error: {error}", file=sys.stderr)
    sys.exit(0)
