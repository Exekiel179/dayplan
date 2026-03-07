from pathlib import Path

from playwright.sync_api import sync_playwright


OUTPUT = Path("artifacts/main-page.png")
URL = "http://127.0.0.1:3000"


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1200}, device_scale_factor=1)
        page.goto(URL, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        page.screenshot(path=str(OUTPUT), full_page=True)
        browser.close()


if __name__ == "__main__":
    main()
