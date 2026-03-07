import json
import time
from datetime import datetime
from pathlib import Path
from urllib import request

from playwright.sync_api import sync_playwright


BASE = "http://127.0.0.1:3000"
OUTPUT = Path("artifacts/latest-day-ui-shot.png")


def api(method: str, path: str, payload=None, token: str | None = None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(BASE + path, data=data, headers=headers, method=method)
    with request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def build_payload(now: int):
    today_key = datetime.now().strftime("%Y-%m-%d")
    return {
        "ability_dimensions": ["表达", "统筹", "产品感", "执行力"],
        "wellbeing": {
            "daily_checkins": {
                today_key: {
                    "initial_energy": 74,
                    "updated_at": now,
                }
            }
        },
        "tasks": [
            {
                "id": "task-live-1",
                "title": "整理发布页视觉细节",
                "description": "正在推进白天主题的微调和对比度检查。",
                "x": 78,
                "y": 32,
                "status": "pending",
                "timeline": "temporary",
                "dependency_ids": [],
                "estimated_minutes": 90,
                "actual_minutes": 18,
                "deadline_at": now + 4 * 3600 * 1000,
                "use_countdown_urgency": True,
                "stress_score": 4,
                "energy_delta": -1,
                "cognitive_load": "high",
                "collaboration_level": "low",
                "tracking_started_at": now - 26 * 60 * 1000,
                "tracking_accumulated_ms": 12 * 60 * 1000,
                "ability_gains": {"产品感": 2, "执行力": 1},
                "steps": [
                    {"id": "s1", "text": "检查顶部总览卡层级", "completed": True},
                    {"id": "s2", "text": "微调四象限色块透明度", "completed": False},
                ],
                "created_at": now - 3 * 3600 * 1000,
                "completion_count": 0,
                "last_completed_at": None,
                "next_due_at": None,
                "archived_at": None,
                "long_term_cadence": "daily",
                "long_term_interval_days": 1,
                "ai_plan": "",
            },
            {
                "id": "task-ready-2",
                "title": "回复协作方确认文案",
                "description": "集中处理消息和确认点。",
                "x": 71,
                "y": 48,
                "status": "pending",
                "timeline": "temporary",
                "dependency_ids": [],
                "estimated_minutes": 35,
                "actual_minutes": 10,
                "deadline_at": now + 7 * 3600 * 1000,
                "use_countdown_urgency": True,
                "stress_score": 3,
                "energy_delta": 0,
                "cognitive_load": "low",
                "collaboration_level": "high",
                "tracking_started_at": None,
                "tracking_accumulated_ms": 0,
                "ability_gains": {"表达": 1, "统筹": 1},
                "steps": [],
                "created_at": now - 2 * 3600 * 1000,
                "completion_count": 0,
                "last_completed_at": None,
                "next_due_at": None,
                "archived_at": None,
                "long_term_cadence": "daily",
                "long_term_interval_days": 1,
                "ai_plan": "",
            },
            {
                "id": "task-ready-3",
                "title": "清理低阻力收尾任务",
                "description": "把零散项一次性收束。",
                "x": 44,
                "y": 62,
                "status": "pending",
                "timeline": "long_term",
                "dependency_ids": [],
                "estimated_minutes": 25,
                "actual_minutes": 6,
                "deadline_at": None,
                "use_countdown_urgency": False,
                "stress_score": 2,
                "energy_delta": 1,
                "cognitive_load": "low",
                "collaboration_level": "low",
                "tracking_started_at": None,
                "tracking_accumulated_ms": 0,
                "ability_gains": {"执行力": 1},
                "steps": [],
                "created_at": now - 5 * 3600 * 1000,
                "completion_count": 1,
                "last_completed_at": now - 24 * 3600 * 1000,
                "next_due_at": now,
                "archived_at": None,
                "long_term_cadence": "daily",
                "long_term_interval_days": 1,
                "ai_plan": "",
            },
            {
                "id": "task-done-4",
                "title": "完成今日复盘记录",
                "description": "已完成一项收尾任务。",
                "x": 59,
                "y": 40,
                "status": "completed",
                "timeline": "temporary",
                "dependency_ids": [],
                "estimated_minutes": 20,
                "actual_minutes": 18,
                "deadline_at": now - 2 * 3600 * 1000,
                "use_countdown_urgency": True,
                "stress_score": 2,
                "energy_delta": 2,
                "cognitive_load": "low",
                "collaboration_level": "low",
                "tracking_started_at": None,
                "tracking_accumulated_ms": 0,
                "ability_gains": {"表达": 2, "产品感": 1, "执行力": 1},
                "steps": [],
                "created_at": now - 8 * 3600 * 1000,
                "completion_count": 2,
                "last_completed_at": now - 40 * 60 * 1000,
                "next_due_at": None,
                "archived_at": None,
                "long_term_cadence": "daily",
                "long_term_interval_days": 1,
                "ai_plan": "",
            },
        ],
    }


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    now = int(time.time() * 1000)
    username = f"shot_{int(time.time())}"
    password = "Pass123456!"
    register_result = api("POST", "/api/auth/register", {"username": username, "password": password})
    token = register_result["token"]
    api("PUT", "/api/tasks", build_payload(now), token=token)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1600, "height": 1400}, device_scale_factor=1)
        page.goto(BASE, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        page.evaluate(
            """(token) => {
                localStorage.setItem('dayplan_auth_token', token);
                localStorage.setItem('dayplan_theme', 'day');
            }""",
            token,
        )
        page.reload(wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.screenshot(path=str(OUTPUT), full_page=True)
        browser.close()

    print(OUTPUT)


if __name__ == "__main__":
    main()
