#!/usr/bin/env python3
"""Stop hook: send a Teams card when a review hands control back to the user.

Claude Code fires `Stop` every time the main agent finishes responding. This hook
narrows that to the case worth interrupting for: a pending review is now sitting
on a PR, waiting for the user to submit it.

Design notes:

* The signal is the pending review itself, not how the review was started. An
  earlier version matched the `Skill` tool call that launched the review, which
  silently missed every run started from a slash command (the skill body is
  loaded into the turn, so no `Skill` tool call is ever recorded).
* The review skills are still NOT modified for detection purposes. Everything
  needed is already in the session transcript, which Claude Code hands us on
  stdin, and the PR comes from the tool call's own `owner`/`repo`/`pullNumber`
  fields rather than a regex over prose — a button can no longer point at the
  wrong PR.
* Dedupe key is session + PR, so one card per PR per session. A review that is
  torn down and rebuilt mid-session (to fix a severity, say) still gets one card.
* The transcript alone cannot say a review is STILL pending: it records what Claude
  did, never what the user did in a browser. Submitting from the GitHub UI leaves no
  trace here, so the state machine would keep believing the review is open. GitHub is
  therefore asked before any card goes out.
* A card is recorded as sent only on HTTP 202, matching pr-merge-ready.py: a
  failed POST is retried on the next Stop rather than silently swallowed.
* Always exits 0. A notifier must never be able to fail a turn.
"""

import datetime
import json
import os
import subprocess
import sys
import time

HOME = os.path.expanduser("~")
TARGETS_FILE = os.path.join(HOME, ".claude/skills/teams-notify/references/targets.json")
STATE_FILE = os.path.join(HOME, ".local/state/review-done-notify.json")
LOG_FILE = os.path.join(HOME, ".local/state/review-done-notify.log")

REVIEW_WRITE_TOOL = "mcp__github__pull_request_review_write"
ADD_COMMENT_TOOL = "mcp__github__add_comment_to_pending_review"
CLOSING_METHODS = ("delete_pending", "submit_pending")

ALIAS = os.environ.get("REVIEW_NOTIFY_ALIAS", "jane-pr")
DRY_RUN = os.environ.get("REVIEW_NOTIFY_DRY_RUN") == "1"
MAX_REMEMBERED = 200


def log(msg):
    try:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
        with open(LOG_FILE, "a") as fh:
            fh.write("%s %s\n" % (time.strftime("%Y-%m-%d %H:%M:%S"), msg))
    except OSError:
        pass


def load_state():
    try:
        with open(STATE_FILE) as fh:
            state = json.load(fh)
        if isinstance(state, dict) and isinstance(state.get("notified"), list):
            return state
    except (OSError, ValueError):
        pass
    return {"notified": []}


def save_state(state):
    state["notified"] = state["notified"][-MAX_REMEMBERED:]
    try:
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        tmp = STATE_FILE + ".tmp"
        with open(tmp, "w") as fh:
            json.dump(state, fh)
        os.replace(tmp, STATE_FILE)
    except OSError as exc:
        log("could not persist state: %s" % exc)


def pr_from(inp):
    """Build the PR descriptor from a GitHub MCP call's own arguments."""
    owner, repo, number = inp.get("owner"), inp.get("repo"), inp.get("pullNumber")
    if not (owner and repo and number):
        return None
    return {
        "owner": owner,
        "repo": repo,
        "number": number,
        "ref": "%s/%s#%s" % (owner, repo, number),
        "url": "https://github.com/%s/%s/pull/%s" % (owner, repo, number),
    }


def scan_transcript(path):
    """Return (pr, comment_count, created_at) for the pending review Claude opened.

    Returns (None, 0, None) when no pending review is outstanding at the end of
    the transcript — none was created, or the one that was got submitted or thrown
    away by Claude. `created_at` is when the surviving `create` ran; `already_submitted`
    compares GitHub's `submitted_at` against it.

    This is a small state machine rather than a search, because a review can be
    torn down and rebuilt within one session: `create` without an `event` opens a
    pending review, `delete_pending` discards it, `submit_pending` means the user
    already sent it, and comments count against whichever review is open at the
    time. A plain "count the comment calls" would have reported 12 for a review
    that was rebuilt once and actually carries 6.

    Lines are pre-filtered by substring before being parsed, so a multi-megabyte
    transcript costs a cheap scan rather than a full JSON parse per line.
    """
    open_review = False
    pr = None
    count = 0
    created_at = None
    try:
        with open(path, errors="replace") as fh:
            for line in fh:
                if REVIEW_WRITE_TOOL not in line and ADD_COMMENT_TOOL not in line:
                    continue
                try:
                    entry = json.loads(line)
                except ValueError:
                    continue
                content = (entry or {}).get("message", {}).get("content")
                if not isinstance(content, list):
                    continue
                for block in content:
                    if not isinstance(block, dict) or block.get("type") != "tool_use":
                        continue
                    name = block.get("name")
                    inp = block.get("input") or {}
                    if name == REVIEW_WRITE_TOOL:
                        method = inp.get("method")
                        # `create` WITH an event submits straight away: never pending.
                        if method == "create" and not inp.get("event"):
                            open_review = True
                            pr = pr_from(inp)
                            count = 0
                            created_at = entry.get("timestamp")
                        elif method in CLOSING_METHODS:
                            open_review = False
                            pr = None
                            count = 0
                            created_at = None
                    elif name == ADD_COMMENT_TOOL and open_review:
                        count += 1
                        if pr is None:
                            pr = pr_from(inp)
    except OSError as exc:
        log("could not read transcript %s: %s" % (path, exc))
        return None, 0, None
    if not open_review or not pr:
        return None, 0, None
    return pr, count, created_at


def parse_iso(value):
    """Parse the ISO-8601 UTC stamps GitHub and the transcript emit.

    `datetime.fromisoformat` only learned to accept a trailing `Z` in 3.11, and both
    sources use one — GitHub as `...:58Z`, the transcript as `...:08.819Z`.
    """
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None


def gh(args):
    """Run `gh` and return parsed JSON, or None if it could not answer."""
    try:
        out = subprocess.run(["gh"] + args, capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError) as exc:
        log("gh %s failed: %s" % (" ".join(args), exc))
        return None
    if out.returncode != 0:
        log("gh %s exited %s: %s" % (" ".join(args), out.returncode, out.stderr.strip()[:200]))
        return None
    try:
        return json.loads(out.stdout)
    except ValueError:
        return None


def already_submitted(pr, created_at):
    """True when the user has already sent a review for this PR, False when one is
    still outstanding, None when GitHub could not be reached.

    This endpoint DOES return the caller's own unsubmitted review as
    `state: PENDING, submitted_at: null` — observed on PR #8838, 2026-08-19. The
    REST docs never say so, which is why the timestamp comparison below survives as
    a backstop: if that behaviour ever changes, "a review of mine was submitted after
    this pending one was opened" still catches the case the card must not fire on.

    PENDING is checked across every review before any timestamp is, so an older
    submitted review cannot mask a newer pending one regardless of list order.
    """
    user = gh(["api", "user"])
    if not isinstance(user, dict) or not user.get("login"):
        return None
    login = user["login"]
    reviews = gh(["api", "repos/%s/%s/pulls/%s/reviews" % (pr["owner"], pr["repo"], pr["number"]),
                  "--paginate"])
    if not isinstance(reviews, list):
        return None
    mine = [r for r in reviews
            if isinstance(r, dict) and (r.get("user") or {}).get("login") == login]

    if any(r.get("state") == "PENDING" for r in mine):
        return False

    opened = parse_iso(created_at)
    if not opened:
        return False
    for review in mine:
        sent = parse_iso(review.get("submitted_at"))
        if sent and sent >= opened:
            return True
    return False


def git_branch(cwd):
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        if out.returncode == 0:
            return out.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        pass
    return None


def resolve_target(alias):
    try:
        with open(TARGETS_FILE) as fh:
            targets = json.load(fh).get("targets", {})
    except (OSError, ValueError) as exc:
        log("could not read %s: %s" % (TARGETS_FILE, exc))
        return None
    entry = targets.get(alias) if isinstance(targets, dict) else None
    if isinstance(entry, dict):
        return entry.get("url")
    return entry if isinstance(entry, str) else None


def build_card(pr, count, cwd, branch):
    if count:
        headline = "Review finished — waiting on you"
        detail = ("Claude left %d pending comment%s. Read them and submit the review yourself."
                  % (count, "" if count == 1 else "s"))
        comments = str(count)
    else:
        headline = "Review finished — nothing found"
        detail = ("Claude found no issues and left a pending review carrying the summary only. "
                  "Approve it yourself if you agree.")
        comments = "none — summary only"
    facts = [
        {"title": "PR", "value": pr["ref"]},
        {"title": "Comments", "value": comments},
        {"title": "Project", "value": os.path.basename(cwd) or cwd},
    ]
    if branch:
        facts.append({"title": "Branch", "value": branch})
    return {
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4",
        "body": [
            {
                "type": "TextBlock",
                "text": headline,
                "weight": "Bolder",
                "size": "Medium",
                "wrap": True,
            },
            {"type": "TextBlock", "text": detail, "wrap": True, "spacing": "Small"},
            {"type": "FactSet", "facts": facts},
        ],
        "actions": [
            {"type": "Action.OpenUrl", "title": "Open PR %s" % pr["ref"].split("#")[-1], "url": pr["url"]},
            {"type": "Action.OpenUrl", "title": "Review comments", "url": pr["url"] + "/files"},
        ],
    }


def send(url, card):
    """POST the card. Returns True only on HTTP 202 — Power Automate answers 202
    on trigger success, and anything else means the flow never ran."""
    try:
        proc = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
             "-X", "POST", url, "-H", "Content-Type: application/json", "-d", "@-"],
            input=json.dumps(card), capture_output=True, text=True, timeout=30,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        log("send failed: %s" % exc)
        return False
    status = proc.stdout.strip()
    if status == "202":
        return True
    log("send returned HTTP %s (not recording, will retry next Stop)" % status)
    return False


def main():
    try:
        payload = json.load(sys.stdin)
    except (ValueError, OSError):
        return

    transcript = payload.get("transcript_path")
    if not transcript or not os.path.exists(transcript):
        return

    pr, count, created_at = scan_transcript(transcript)
    if not pr:
        return

    session = payload.get("session_id") or os.path.splitext(os.path.basename(transcript))[0]
    key = "%s:%s" % (session, pr["ref"])

    state = load_state()
    if key in state["notified"]:
        return

    sent_already = already_submitted(pr, created_at)
    if sent_already is None:
        # Indeterminate: say nothing and leave the key unrecorded so the next Stop retries.
        log("could not confirm review state for %s, will retry next Stop" % pr["ref"])
        return
    if sent_already:
        # The user submitted it in the browser. Record the key so this stops being asked.
        state["notified"].append(key)
        save_state(state)
        log("suppressed pr=%s — already submitted by the user" % pr["ref"])
        return

    cwd = payload.get("cwd") or os.getcwd()
    card = build_card(pr, count, cwd, git_branch(cwd))

    if DRY_RUN:
        log("DRY_RUN pr=%s comments=%d key=%s" % (pr["ref"], count, key))
        print(json.dumps(card, indent=2))
        return

    url = resolve_target(ALIAS)
    if not url:
        log("notification target '%s' not registered in %s" % (ALIAS, TARGETS_FILE))
        return

    if send(url, card):
        state["notified"].append(key)
        save_state(state)
        log("notified pr=%s comments=%d key=%s" % (pr["ref"], count, key))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # a notifier must never break a turn
        log("unhandled error: %s" % exc)
