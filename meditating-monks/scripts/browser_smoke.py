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
    config["ensemble"]["mode"] = "distributed"
    config_path = directory / "node.json"
    config_path.write_text(json.dumps(config))

    profile = json.loads((ROOT / "profiles" / config["profile"]).read_text())
    phases = {phase["id"]: phase for phase in profile["phases"]}
    once = phases["refuge"]
    loop = phases["mani"]
    # Two long sections let us select both audio modes without waiting for the public ritual.
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
    return config_path, profiles, media, (once["label"], loop["label"])


def open_room(page, url, errors):
    page.set_default_timeout(TIMEOUT_MS)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script(OBSERVE)
    page.goto(url, wait_until="domcontentloaded")
    expect(page.locator("#error-banner")).to_be_hidden()
    expect(page.locator("#connection-label")).to_have_text("Der Raum ist geöffnet")
    seats = page.locator("#room-viewport").get_by_role("button", name="Mönch", exact=False)
    expect(seats).to_have_count(108)
    return seats


def seat_at(seats, index):
    return seats.and_(seats.page.locator(f'[data-i="{index}"]'))


def check_room(browser, url, output, errors, record):
    page = browser.new_page(viewport={"width": 1440, "height": 960})
    try:
        seats = open_room(page, url, errors)
        expect(page.locator("#view-room")).to_have_attribute("aria-pressed", "true")
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
        page.keyboard.press("Tab")
        expect(page.locator(".skip-link")).to_be_focused()
        page.locator(".skip-link").blur()
        for width in (640, 768):
            page.set_viewport_size({"width": width, "height": 960})
            assert not page.evaluate("document.documentElement.scrollWidth > innerWidth"), width
        page.set_viewport_size({"width": 1440, "height": 960})
        page.screenshot(path=output / "desktop.png", full_page=True, animations="disabled")
        first = seat_at(seats, 0)
        second = seat_at(seats, 1)
        first.press("ArrowRight")
        expect(second).to_have_attribute("aria-pressed", "true")
        expect(second).to_be_focused()
        first.press("Enter")
        expect(first).to_have_attribute("aria-pressed", "true")
        enlarge = page.locator(".rr-enlarge")
        enlarge.press("Enter")
        expect(enlarge).to_have_attribute("aria-pressed", "true")
        expect(page.get_by_role("dialog", name="Vergrößerter Ritualraum")).to_be_visible()
        assert page.locator("#audio-mode").evaluate("(node) => Boolean(node.closest('[inert]'))")
        page.keyboard.press("Tab")
        expect(first).to_be_focused()
        page.keyboard.press("Shift+Tab")
        expect(enlarge).to_be_focused()
        page.keyboard.press("Shift+Tab")
        expect(first).to_be_focused()
        page.keyboard.press("Escape")
        expect(enlarge).to_have_attribute("aria-pressed", "false")
        expect(enlarge).to_be_focused()
        assert not page.locator("#audio-mode").evaluate("(node) => Boolean(node.closest('[inert]'))")
        page.locator("#room-bubbles").check()
        expect(first.locator(".rrChip text")).not_to_be_empty()
        record("Desktop and tablet: 108 seats, keyboard entry and selection, bubbles, enlarged-room focus and Escape, no page overflow")

        page.locator("#view-list").click()
        expect(page.locator(".monk-tile")).to_have_count(72)
        page.locator("#page-next").click()
        expect(page.locator(".monk-tile")).to_have_count(36)
        page.locator("#page-prev").click()
        expect(page.locator(".monk-tile")).to_have_count(72)
        record("List pagination: 72 + 36")

        page.locator("#mala-open").click()
        expect(page.locator("#mala-add")).to_be_focused()
        page.locator("#mala-add").press("Enter")
        page.locator("#mala-add").press("Enter")
        page.locator("#mala-undo").click()
        expect(page.locator("#mala-count")).to_have_text("1")
        page.keyboard.press("Escape")
        expect(page.locator("#mala-dialog")).to_be_hidden()
        page.reload(wait_until="domcontentloaded")
        expect(page.locator("#connection-label")).to_have_text("Der Raum ist geöffnet")
        page.locator("#mala-open").click()
        expect(page.locator("#mala-count")).to_have_text("1")
        page.keyboard.press("Escape")
        record("Mala: keyboard add, undo, Escape, and real storage after reload")

        page.locator("#audio-toggle").click()
        expect(page.locator("#audio-status")).to_contain_text("Noch keine Aufnahme")
        expect(page.locator("#audio-toggle")).to_have_attribute("aria-pressed", "false")
        page.wait_for_function("() => window.smoke.heartbeat > 0")
        heartbeat = page.evaluate("window.smoke.heartbeat")
        page.wait_for_function("previous => window.smoke.heartbeat > previous", arg=heartbeat)
        record("Missing recording is disclosed and real SSE heartbeats advance")
    finally:
        page.close()

    mobile = browser.new_page(
        viewport={"width": 390, "height": 844}, is_mobile=True,
        has_touch=True, reduced_motion="reduce",
    )
    try:
        seats = open_room(mobile, url, errors)
        expect(mobile.locator("#room-calm")).to_be_checked()
        assert seats.first.locator(".m").evaluate("(node) => getComputedStyle(node).animationName") == "none"
        assert not mobile.evaluate("document.documentElement.scrollWidth > innerWidth")
        assert mobile.locator(".rr-scroll").evaluate("(node) => node.scrollWidth > node.clientWidth")
        mobile.screenshot(path=output / "mobile.png", full_page=True, animations="disabled")
        record("Mobile 390px: reduced motion and internal room scroll without page overflow")
    finally:
        mobile.close()


def check_audio(browser, url, process, errors, labels, record):
    page = browser.new_page()
    try:
        seats = open_room(page, url, errors)
        listen = page.locator("#audio-toggle")
        status = page.locator("#audio-status")
        phase = page.locator("#selected-phase")
        once_label, loop_label = labels

        expect(phase).to_have_text(loop_label)
        loop_seat = seats.and_(page.locator('[aria-pressed="true"]'))
        loop_seat_id = loop_seat.get_attribute("data-i")
        seat_at(seats, 0).press("Enter")
        expect(phase).to_have_text(once_label)
        listen.click()
        expect(listen).to_have_attribute("aria-pressed", "true")
        page.wait_for_function("() => window.smoke.starts.length > 0")
        assert page.evaluate("window.smoke.starts.map(source => source.loop)") == [False]
        once_start = page.evaluate("window.smoke.starts[0]")
        assert abs(once_start["offset"] + once_start["duration"] - 8) < 0.01
        page.wait_for_function("() => window.smoke.ended === 1", timeout=TIMEOUT_MS)
        heartbeat = page.evaluate("window.smoke.heartbeat")
        page.wait_for_function("previous => window.smoke.heartbeat > previous", arg=heartbeat)
        assert page.evaluate("window.smoke.starts.length") == 1
        record("Once recording: one unlooped native source ends and stays silent across a later heartbeat")

        page.locator("#chorus-mode").select_option("off")
        seat_at(seats, loop_seat_id).press("Enter")
        expect(phase).to_have_text(loop_label)
        page.wait_for_function("() => window.smoke.starts.length > 1")
        assert page.evaluate("window.smoke.starts.map(source => source.loop)") == [False, True]

        page.locator("#chorus-mode").select_option("sparse")
        expect(status).to_contain_text("Raumchor:")
        sparse_count = page.evaluate("window.smoke.starts.length - 1")
        assert sparse_count == 12
        assert page.evaluate("window.smoke.starts.slice(2).every(source => source.loop)")
        page.locator("#chorus-mode").select_option("full")
        page.wait_for_function("previous => window.smoke.starts.length - 1 > previous + 12", arg=sparse_count)
        full_count = page.evaluate("window.smoke.starts.length - 1") - sparse_count + 1
        assert full_count == 108
        record(f"Native Web Audio: solo, sparse ({sparse_count} sources), and full ({full_count} sources)")

        stop_server(process)
        expect(page.locator("#connection-label")).to_contain_text("Anzeige eingefroren", timeout=12_000)
        expect(listen).to_have_attribute("aria-pressed", "false")
        expect(status).to_contain_text("Audio wurde gestoppt")
        page.wait_for_function("() => window.smoke.ended === window.smoke.starts.length")
        record("Real server disconnect freezes the display and ends every audio source")
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
                config, profiles, media, labels = prepare_audio(directory)
                with serve(directory / "audio-server", config=config, profiles=profiles, media=media) as (url, process):
                    check_audio(browser, url, process, errors, labels, record)
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
