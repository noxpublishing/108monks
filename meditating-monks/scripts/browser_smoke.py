"""Exercise the actual app over loopback in Chromium with isolated data and synthetic audio."""

from __future__ import annotations

import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen
import wave

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
TIMEOUT_MS = 10_000

# Observe native audio and SSE without replacing their transport or generated sound.
OBSERVE = """
window.smoke = { starts: [], ended: 0, heartbeat: 0 };
const start = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function (...args) {
    start.apply(this, args);
    window.smoke.starts.push({ loop: this.loop, offset: args[1], duration: args[2] });
    this.addEventListener('ended', () => window.smoke.ended++, { once: true });
};
window.EventSource = class extends EventSource {
    constructor(...args) {
        super(...args);
        this.addEventListener('state', event => {
            window.smoke.heartbeat = JSON.parse(event.data).updated_at_ms;
        });
    }
};
"""


def stop_server(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


@contextmanager
def serve(directory, *, config=None, profiles=None, media=None):
    directory.mkdir()
    log_path = directory / "server.log"
    env = {
        **os.environ,
        "MM_CONFIG": str(config or ROOT / "config/node.example.json"),
        "MM_DATA_DIR": str(directory / "data"),
        "MM_MEDIA_DIR": str(media or directory / "media"),
        "MM_PEERS": str(directory / "peers.json"),
        "MM_PROFILES_DIR": str(profiles or ROOT / "profiles"),
    }
    with log_path.open("w") as log, socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        url = f"http://127.0.0.1:{listener.getsockname()[1]}"
        fd = listener.fileno()
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--fd", str(fd),
             "--no-access-log", "--timeout-graceful-shutdown", "2"],
            cwd=ROOT,
            env=env,
            pass_fds=(fd,),
            stdout=log,
            stderr=subprocess.STDOUT,
        )

    try:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline and process.poll() is None:
            try:
                with urlopen(f"{url}/healthz", timeout=0.5) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError(f"Loopback app did not become healthy:\n{log_path.read_text()}")
        yield url, process
    finally:
        stop_server(process)


def prepare_audio(directory):
    profiles = directory / "profiles"
    profiles.mkdir()
    media = directory / "media"
    media.mkdir()
    config = json.loads((ROOT / "config/node.example.json").read_text())
    config_path = directory / "node.json"
    config_path.write_text(json.dumps(config))

    profile = json.loads((ROOT / "profiles" / config["profile"]).read_text())
    phases = {phase["id"]: phase for phase in profile["phases"]}
    once = phases["refuge"]
    loop = phases["mani"]
    # Reach both recording modes through a real phase transition in the smoke test.
    once["duration_ms"] = 2 * once["unit_ms"]
    profile["phases"] = [once, loop]
    (profiles / config["profile"]).write_text(json.dumps(profile))
    manifest = []
    for phase, seconds in ((once, 8), (loop, loop["unit_ms"] / 1000)):
        audio_id = phase["audio_id"]
        filename = f"{audio_id}.wav"
        with wave.open(str(media / filename), "wb") as audio:
            audio.setparams((1, 2, 8000, 0, "NONE", "not compressed"))
            file_seconds = seconds + 2 if phase["audio_mode"] == "once" else seconds
            audio.writeframes(b"\x00\x00" * round(8000 * file_seconds))
        manifest.append({
            "id": audio_id, "file": filename, "title": f"Silent smoke fixture {audio_id}",
            "performer": "Browser smoke", "license": "Test fixture",
            "permission_note": "Generated silence", "language": "und",
            "loop_start_seconds": 0, "loop_end_seconds": seconds,
        })
    (media / config["audio_manifest"]).write_text(json.dumps(manifest))
    return config_path, profiles, media


def open_room(page, url, errors):
    page.set_default_timeout(TIMEOUT_MS)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script(OBSERVE)
    page.goto(url, wait_until="domcontentloaded")
    expect(page.get_by_role("img", name="Digitaler Ritualraum mit 108 meditierenden Mönchen")).to_be_visible()
    expect(page.locator(".rr-seat")).to_have_count(108)
    expect(page.locator("#room-notice")).to_be_hidden()


def check_framing(page, rows):
    result = page.evaluate("""() => {
        const figures = [...document.querySelectorAll('.rr-monk > image')];
        return {
            visible: figures.every(figure => {
                const { x, y, right, bottom, width, height } = figure.getBoundingClientRect();
                return width > 0 && height > 0 && x >= -1 && y >= -1 &&
                    right <= innerWidth + 1 && bottom <= innerHeight + 1;
            }),
            rows: new Set(figures.map(figure => figure.getAttribute('y'))).size,
            fits: document.documentElement.scrollWidth === innerWidth &&
                document.documentElement.scrollHeight === innerHeight
        };
    }""")
    assert result == {"visible": True, "rows": rows, "fits": True}, result


def check_room(browser, url, output, errors, record):
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    try:
        open_room(page, url, errors)
        check_framing(page, rows=9)
        expect(page.locator("header, footer, nav, dialog, select, input")).to_have_count(0)
        expect(page.get_by_role("button")).to_have_count(0)
        expect(page.locator(".rr-monk").first).to_have_css("animation-name", "breathe")
        page.screenshot(path=output / "desktop.png", animations="disabled")
        record("Desktop: all 108 monks in nine rows, with no visible controls without recordings")

        source_link = page.get_by_role("link", name="Quellcode")
        page.keyboard.press("Tab")
        expect(source_link).to_be_focused()
        with page.expect_download() as download:
            source_link.press("Enter")
        assert download.value.suggested_filename == "meditating-monks-source.zip"
        page.wait_for_function("() => window.smoke.heartbeat > 0")
        heartbeat = page.evaluate("window.smoke.heartbeat")
        page.wait_for_function("previous => window.smoke.heartbeat > previous", arg=heartbeat)
        record("Keyboard-accessible source download and real SSE heartbeats")
    finally:
        page.close()

    mobile = browser.new_page(
        viewport={"width": 390, "height": 844}, is_mobile=True,
        has_touch=True, reduced_motion="reduce",
    )
    try:
        open_room(mobile, url, errors)
        check_framing(mobile, rows=18)
        expect(mobile.locator(".rr-monk").first).to_have_css("animation-name", "none")
        mobile.screenshot(path=output / "mobile.png")
        mobile.set_viewport_size({"width": 844, "height": 390})
        expect(mobile.locator(".rr-svg")).to_have_attribute("viewBox", "0 0 1100 780")
        check_framing(mobile, rows=9)
        record("Mobile: all 108 monks in portrait and landscape, no scrolling, reduced motion honored")
    finally:
        mobile.close()


def check_audio(browser, url, process, errors, record):
    page = browser.new_page(viewport={"width": 1440, "height": 900}, has_touch=True)
    try:
        open_room(page, url, errors)
        listen = page.get_by_role("button", name="Ton im Ritualraum")
        expect(listen).to_have_attribute("aria-pressed", "false")
        assert page.evaluate("window.smoke.starts.length") == 0

        page.keyboard.press("Tab")
        expect(listen).to_be_focused()
        page.keyboard.press("Space")
        expect(listen).to_have_attribute("aria-pressed", "true")
        expect(page.locator("#room")).to_have_class("is-listening")
        page.wait_for_function("() => window.smoke.starts.length > 0")
        assert page.evaluate("window.smoke.starts.map(source => source.loop)") == [False]
        once = page.evaluate("window.smoke.starts[0]")
        assert abs(once["offset"] + once["duration"] - 8) < .01
        page.wait_for_function("() => window.smoke.ended === 1")
        record("Keyboard activates optional audio and a once recording stops at its manifest boundary")

        page.wait_for_function(
            "() => window.smoke.starts.length - window.smoke.ended === 108", timeout=25_000,
        )
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_function("() => window.smoke.starts.length - window.smoke.ended === 12")
        check_framing(page, rows=18)
        listen.tap()
        expect(listen).to_have_attribute("aria-pressed", "false")
        expect(page.locator("#room")).not_to_have_class("is-listening")
        page.wait_for_function("() => window.smoke.starts.length === window.smoke.ended")
        listen.tap()
        expect(listen).to_have_attribute("aria-pressed", "true")
        page.wait_for_function("() => window.smoke.starts.length - window.smoke.ended === 12")
        record("Direct touch toggle and native choir with 108 desktop and 12 portrait sources")

        stop_server(process)
        expect(page.locator("#room")).to_have_class("is-paused", timeout=12_000)
        expect(listen).to_have_attribute("aria-pressed", "false")
        page.wait_for_function("() => window.smoke.ended === window.smoke.starts.length")
        record("Server loss freezes the room and ends every audio source")
    finally:
        page.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium", help="Path to a Chromium executable (default: Playwright Chromium)")
    parser.add_argument("--output", type=Path, default=ROOT / "test-results")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    checks, errors = [], []

    def record(check):
        checks.append(check)
        print(check, flush=True)

    try:
        with tempfile.TemporaryDirectory(prefix="monks-browser-") as scratch, sync_playwright() as playwright:
            directory = Path(scratch)
            with playwright.chromium.launch(executable_path=args.chromium) as browser:
                with serve(directory / "text-server") as (url, _):
                    check_room(browser, url, args.output, errors, record)
                config, profiles, media = prepare_audio(directory)
                with serve(directory / "audio-server", config=config, profiles=profiles, media=media) as (url, process):
                    check_audio(browser, url, process, errors, record)
                assert not errors, errors
                record("No uncaught JavaScript errors")
    except Exception as error:
        errors.append(str(error))
        raise
    finally:
        report = {
            "mode": "real Chromium against local Uvicorn with isolated data and synthetic audio",
            "checks": checks, "count": len(checks), "errors": errors,
        }
        serialized = json.dumps(report, ensure_ascii=False, indent=2)
        (args.output / "browser-report.json").write_text(serialized + "\n", encoding="utf-8")
        print(serialized)


if __name__ == "__main__":
    main()
