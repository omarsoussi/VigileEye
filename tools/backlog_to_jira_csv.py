#!/usr/bin/env python3
"""Convert JIRA_PRODUCT_BACKLOG.md into a Jira-importable CSV.

This produces:
- One parent issue per task section ("### x.y — Title") as Issue Type = Task
- One sub-task per checkbox under "**Subtasks**" as Issue Type = Sub-task

The file uses numeric Issue Id / Parent Id linkage, which Jira's CSV importer
can map to create sub-tasks.

Usage:
  python tools/backlog_to_jira_csv.py \
    --input JIRA_PRODUCT_BACKLOG.md \
    --output JIRA_PRODUCT_BACKLOG_JIRA_IMPORT.csv
"""

from __future__ import annotations

import argparse
import csv
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Optional


SPRINT_RE = re.compile(r"^#\s+📅\s*SPRINT\s+(\d+)\s*:\s*(.+?)\s*$")
TASK_RE = re.compile(r"^###\s+([0-9]+\.[0-9]+)\s+—\s+(.+?)\s*$")
FIELD_RE = re.compile(r"^\*\*(.+?)\*\*:\s*(.*?)\s*$")
CHECKBOX_RE = re.compile(r"^-\s+\[[xX ]\]\s+(.+?)\s*$")
AC_BULLET_RE = re.compile(r"^-\s+✅\s+(.+?)\s*$")


@dataclass
class Task:
    task_code: str
    title: str
    sprint_number: int
    sprint_title: str
    priority: str = ""
    story_points: str = ""
    duration: str = ""
    assignee: str = ""
    description: str = ""
    technologies: str = ""
    acceptance_criteria: List[str] = field(default_factory=list)
    subtasks: List[str] = field(default_factory=list)

    @property
    def sprint_name(self) -> str:
        return f"Sprint {self.sprint_number} - {self.sprint_title.strip()}"

    @property
    def summary(self) -> str:
        return f"S{self.sprint_number} {self.task_code} - {self.title.strip()}"

    def build_description(self) -> str:
        parts: List[str] = []
        if self.description:
            parts.append(self.description.strip())
        if self.technologies:
            parts.append(f"Technologies: {self.technologies.strip()}")
        if self.duration:
            parts.append(f"Duration: {self.duration.strip()}")
        if self.assignee:
            parts.append(f"Assignee (role): {self.assignee.strip()}")
        if self.acceptance_criteria:
            parts.append("Acceptance Criteria:\n" + "\n".join(f"- {a}" for a in self.acceptance_criteria))
        if self.subtasks:
            parts.append("Subtasks:\n" + "\n".join(f"- {s}" for s in self.subtasks))
        return "\n\n".join(parts).strip()


def iter_lines(text: str) -> Iterable[str]:
    for line in text.splitlines():
        yield line.rstrip("\n")


def parse_backlog(md_text: str) -> List[Task]:
    sprint_number: Optional[int] = None
    sprint_title: Optional[str] = None

    tasks: List[Task] = []
    current: Optional[Task] = None

    mode: Optional[str] = None  # None | "ac" | "subtasks"

    for line in iter_lines(md_text):
        sprint_match = SPRINT_RE.match(line)
        if sprint_match:
            sprint_number = int(sprint_match.group(1))
            sprint_title = sprint_match.group(2).strip()
            current = None
            mode = None
            continue

        task_match = TASK_RE.match(line)
        if task_match and sprint_number is not None and sprint_title is not None:
            current = Task(
                task_code=task_match.group(1),
                title=task_match.group(2),
                sprint_number=sprint_number,
                sprint_title=sprint_title,
            )
            tasks.append(current)
            mode = None
            continue

        if current is None:
            continue

        if line.strip() == "**Acceptance Criteria**:":
            mode = "ac"
            continue
        if line.strip() == "**Subtasks**:":
            mode = "subtasks"
            continue

        # Mode-specific bullets
        if mode == "ac":
            m = AC_BULLET_RE.match(line)
            if m:
                current.acceptance_criteria.append(m.group(1).strip())
                continue
            # stop AC section when blank or next field separator
            if not line.strip() or line.startswith("**") or line.startswith("---"):
                mode = None

        if mode == "subtasks":
            m = CHECKBOX_RE.match(line)
            if m:
                current.subtasks.append(m.group(1).strip())
                continue
            if not line.strip() or line.startswith("**") or line.startswith("---"):
                mode = None

        # Field lines like **Priority**: High
        field_match = FIELD_RE.match(line)
        if field_match:
            key = field_match.group(1).strip().lower()
            value = field_match.group(2).strip()
            if key == "priority":
                current.priority = value
            elif key == "story points":
                current.story_points = value
            elif key == "duration":
                current.duration = value
            elif key == "assignee":
                current.assignee = value
            elif key == "description":
                current.description = value
            elif key == "technologies":
                current.technologies = value
            continue

    return tasks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    md_text = input_path.read_text(encoding="utf-8")
    tasks = parse_backlog(md_text)

    # Generate CSV rows
    rows: List[dict] = []
    next_id = 1

    for task in tasks:
        task_id = next_id
        next_id += 1

        rows.append(
            {
                "Issue Id": str(task_id),
                "Issue Type": "Task",
                "Summary": task.summary,
                "Description": task.build_description(),
                "Priority": task.priority,
                "Story Points": task.story_points,
                "Sprint": task.sprint_name,
                "Assignee": "",  # leave blank to avoid import failures
                "Labels": f"sprint-{task.sprint_number}",
                "Parent Id": "",
            }
        )

        for sub in task.subtasks:
            sub_id = next_id
            next_id += 1
            rows.append(
                {
                    "Issue Id": str(sub_id),
                    "Issue Type": "Sub-task",
                    "Summary": sub,
                    "Description": f"Parent: {task.summary}",
                    "Priority": task.priority,
                    "Story Points": "",
                    "Sprint": task.sprint_name,
                    "Assignee": "",
                    "Labels": f"sprint-{task.sprint_number}",
                    "Parent Id": str(task_id),
                }
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "Issue Id",
                "Issue Type",
                "Summary",
                "Description",
                "Priority",
                "Story Points",
                "Sprint",
                "Assignee",
                "Labels",
                "Parent Id",
            ],
            quoting=csv.QUOTE_ALL,
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {output_path}")
    print(f"Parsed {len(tasks)} parent tasks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
