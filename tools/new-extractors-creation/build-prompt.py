#!/usr/bin/env python3
"""Build the extractor agent's prompt for the auto-implement-extractor pipeline.

Fetches the triggering issue via the GitHub API (so a free-form body is never
shell-interpolated) and interpolates it — plus the branch / slug / caseName /
host / url the triage step emitted — into agent-prompt-extractor.md (alongside
this file). Writes the result to /tmp/agent-prompt.txt for the agent step. See
docs/claude/auto-extractor.md.

Reads REPO, ISSUE_NUMBER, GH_TOKEN, BRANCH, SLUG, CASE_NAME, HOST, EVENT_URL
from the env (set by the workflow step).
"""
import json, os, urllib.request

repo = os.environ["REPO"]
issue_number = os.environ["ISSUE_NUMBER"]
token = os.environ["GH_TOKEN"]

req = urllib.request.Request(
    f"https://api.github.com/repos/{repo}/issues/{issue_number}",
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    },
)
with urllib.request.urlopen(req) as r:
    issue = json.load(r)

template_path = os.path.join(os.path.dirname(__file__), "agent-prompt-extractor.md")
template = open(template_path).read()
prompt = (template
    .replace("{{ISSUE_NUMBER}}", issue_number)
    .replace("{{ISSUE_TITLE}}", issue["title"])
    .replace("{{ISSUE_BODY}}", issue["body"] or "")
    .replace("{{REPO}}", repo)
    .replace("{{BRANCH}}", os.environ["BRANCH"])
    .replace("{{SLUG}}", os.environ["SLUG"])
    .replace("{{CASE_NAME}}", os.environ["CASE_NAME"])
    .replace("{{HOST}}", os.environ["HOST"])
    .replace("{{EVENT_URL}}", os.environ["EVENT_URL"])
    # Where the agent writes its diagnosis when it judges the page unextractable;
    # phase2-finalize.sh reads it to post the bail comment. /tmp so the
    # blast-radius `git clean` can't delete it. Defaulted so a local run works.
    .replace("{{BAIL_REASON_FILE}}", os.environ.get("BAIL_REASON_FILE", "/tmp/agent-bail-reason.md")))

open("/tmp/agent-prompt.txt", "w").write(prompt)
print(f"Prompt length: {len(prompt)} chars")
