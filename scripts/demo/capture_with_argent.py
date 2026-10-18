#!/usr/bin/env python3
import os
import sys
import json
import time
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEMO_DIR = Path(__file__).resolve().parent
AUDIO_DIR = DEMO_DIR / "audio"
RECORDINGS_DIR = ROOT_DIR / ".argent/recordings"

# Tab and UI Normalized Coordinates (from Argent describe)
# Tab and UI Normalized Coordinates (exact uiautomator bounds on 1080x2400)
COORDINATES = {
    "tab_coach": (0.117, 0.910),           # (126, 2184)
    "tab_nutrition": (0.308, 0.910),       # (333, 2184)
    "tab_workout": (0.500, 0.910),         # (540, 2184)
    "tab_analyze": (0.692, 0.910),         # (747, 2184)
    "tab_settings": (0.883, 0.910),        # (954, 2184)
    "coach_clear_trash": (0.930, 0.077),    # (1005, 185)
    "coach_suggest_workout": (0.225, 0.762),# (243, 1828)
    "nutrition_log_btn": (0.874, 0.091),    # (944, 218)
    "food_tab_snap": (0.203, 0.215),
    "food_tab_search": (0.503, 0.215),      # (543, 516)
    "food_tab_barcode": (0.799, 0.215),     # (863, 516)
    "food_upload_btn": (0.713, 0.657),      # (770, 1576)
    "picker_first_photo": (0.167, 0.567),   # (180, 1360)
    "picker_done_btn": (0.790, 0.910),      # (853, 2184)
    "crop_btn": (0.880, 0.083),             # (950, 200)
    "log_food_confirm_btn": (0.500, 0.892), # (540, 2140)
    "food_review_close": (0.860, 0.083),
    "analyze_subtab_recovery": (0.800, 0.588),
}

def run_cmd(cmd):
    return subprocess.check_output(cmd, shell=True).decode()

def argent_tap(udid, x, y, label=""):
    lbl = f" [{label}]" if label else ""
    px = int(round(x * 1080))
    py = int(round(y * 2400))
    print(f"   👉 Tap at ({x:.3f}, {y:.3f}) -> ({px}, {py}){lbl}")
    cmd = f"adb -s {udid} shell input tap {px} {py}"
    subprocess.run(cmd, shell=True)

def argent_swipe(udid, from_x, from_y, to_x, to_y, duration_ms=600, label=""):
    lbl = f" [{label}]" if label else ""
    fx, fy = int(round(from_x * 1080)), int(round(from_y * 2400))
    tx, ty = int(round(to_x * 1080)), int(round(to_y * 2400))
    print(f"   👆 Swipe ({from_x:.2f},{from_y:.2f}) -> ({to_x:.2f},{to_y:.2f}) {duration_ms}ms{lbl}")
    cmd = f"adb -s {udid} shell input swipe {fx} {fy} {tx} {ty} {duration_ms}"
    subprocess.run(cmd, shell=True)

def wait_until(target_elapsed, start_time, label=""):
    while True:
        elapsed = time.time() - start_time
        remaining = target_elapsed - elapsed
        if remaining <= 0:
            break
        sys.stdout.write(f"\r⏳ {label} Elapsed: {elapsed:.1f}s | Target: {target_elapsed:.1f}s ({remaining:.1f}s left)   ")
        sys.stdout.flush()
        time.sleep(0.1)
    sys.stdout.write("\n")

def main():
    print("🎬 ==================================================")
    print("   ZeroCoach Hacktoberfest Demo Capture with Argent")
    print("====================================================\n")

    # 1. Discover connected devices via Argent
    print("🔍 Discovering connected devices via Argent...")
    try:
        devices_json = run_cmd("npx -y @swmansion/argent@latest run list-devices --json")
        data = json.loads(devices_json)
        devices = data.get("devices", [])
        if not devices:
            print("❌ No devices found! Please connect phone via USB with USB debugging enabled.")
            sys.exit(1)
        udid = devices[0]["serial"]
        model = devices[0].get("model", "Android Device")
        print(f"   ✅ Target Device: {model} (Serial: {udid})\n")
    except Exception as e:
        print(f"❌ Failed to run Argent list-devices: {e}")
        sys.exit(1)

    # 2. Verify timeline & audio
    timeline_path = AUDIO_DIR / "timeline.json"
    if not timeline_path.exists():
        print("⚠️  timeline.json not found! Running generate_audio.py first...")
        subprocess.run([str(ROOT_DIR / "ml/venv/bin/python"), str(DEMO_DIR / "generate_audio.py")], check=True)

    with open(timeline_path) as f:
        timeline = json.load(f)

    total_narration_dur = timeline[-1]["endTime"]
    total_target_time = total_narration_dur + 2.0
    print(f"📋 Master Narration Audio Duration: {total_narration_dur:.2f}s (~{round(total_target_time)}s recording window)\n")

    # 3. Pre-flight Setup: Ensure app is frontmost and clean
    print("🧹 Pre-flight App Preparation...")
    subprocess.run("adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.zerocoach.app/.MainActivity", shell=True, stdout=subprocess.DEVNULL)
    time.sleep(1.0)

    # Clean chat to start fresh for Scene 2
    print("   Switching to Coach to clear previous chat buffer...")
    argent_tap(udid, *COORDINATES["tab_coach"], "Switch to Coach")
    time.sleep(0.8)
    argent_tap(udid, *COORDINATES["coach_clear_trash"], "Clear Chat History")
    time.sleep(0.8)

    # Switch to Settings tab to begin Scene 1
    print("   Switching to Settings tab for Scene 1 start...")
    argent_tap(udid, *COORDINATES["tab_settings"], "Prepare Scene 1 (Settings)")
    time.sleep(1.2)

    # 4. Start Argent Screen Recording
    print("\n🔴 STARTING ARGENT SCREEN RECORDING (30fps native, showTouches enabled, trimStatic=false)...")
    start_cmd = f"npx -y @swmansion/argent@latest run screen-recording-start --udid {udid} --timeLimitSeconds 300 --showTouches true --trimStatic false --json"
    start_res = json.loads(run_cmd(start_cmd))
    print(f"   ✅ Argent Recording Active: Status = {start_res.get('status')}\n")

    recording_start = time.time()

    try:
        # ==========================================
        # SCENE 1: COMMERCIAL DISRUPTION & 0-CLOUD PRIVACY (0.0s - 27.7s)
        # ==========================================
        print("\n🎬 >>> SCENE 1: Commercial Disruption & 0-Cloud Privacy")
        wait_until(5.0, recording_start, "Scene 1: Settings Overview")
        argent_swipe(udid, 0.5, 0.75, 0.5, 0.40, 700, "Scroll to Gemma 2 GGUF specs")
        wait_until(14.0, recording_start, "Scene 1: Reviewing on-device engine specs")
        argent_swipe(udid, 0.5, 0.40, 0.5, 0.75, 700, "Scroll back to top")
        wait_until(27.0, recording_start, "Scene 1: Completing Phase 1")

        # ==========================================
        # SCENE 2: ON-DEVICE ATHLETIC INTELLIGENCE (28.9s - 47.5s)
        # ==========================================
        print("\n🎬 >>> SCENE 2: On-Device Athletic Intelligence & Streaming")
        argent_tap(udid, *COORDINATES["tab_coach"], "Switch to Coach Tab")
        wait_until(30.0, recording_start, "Scene 2: Transitioned to Coach")
        argent_tap(udid, *COORDINATES["coach_suggest_workout"], "Tap 'Suggest workout plan'")
        print("   ⚡ Prompt sent! Gemma 2 streaming on-device at ~38 tok/s...")
        wait_until(41.0, recording_start, "Scene 2: Watching tokens stream")
        argent_swipe(udid, 0.5, 0.70, 0.5, 0.45, 600, "Scroll down to reveal workout breakdown")
        wait_until(47.5, recording_start, "Scene 2: Completing Phase 2")

        # ==========================================
        # SCENE 3: MULTIMODAL FOOD LOG & VISION (48.7s - 72.2s)
        # ==========================================
        print("\n🎬 >>> SCENE 3: Multimodal Food Log: AI Snap, Search & Barcode")
        argent_tap(udid, *COORDINATES["tab_nutrition"], "Switch to Nutrition Tab")
        wait_until(49.8, recording_start, "Scene 3: Nutrition Tab")
        argent_tap(udid, *COORDINATES["nutrition_log_btn"], "Tap '+ Log' button")
        wait_until(51.2, recording_start, "Scene 3: Log Food Modal")
        argent_tap(udid, *COORDINATES["food_upload_btn"], "Tap 'Upload Photo'")
        wait_until(52.8, recording_start, "Scene 3: Photo picker open")
        argent_tap(udid, *COORDINATES["picker_first_photo"], "Select 1st photo (Food)")
        time.sleep(0.5)
        argent_tap(udid, *COORDINATES["picker_done_btn"], "Tap 'Done'")
        wait_until(54.5, recording_start, "Scene 3: Image crop screen")
        argent_tap(udid, *COORDINATES["crop_btn"], "Tap 'CROP'")
        print("   🔍 Analyzing meal photo with Gemini Vision + ZeroCoach AI...")
        wait_until(63.5, recording_start, "Scene 3: Showing decomposed macro review")
        argent_tap(udid, *COORDINATES["log_food_confirm_btn"], "Tap 'Log to LUNCH' button")
        wait_until(66.5, recording_start, "Scene 3: Logged portion to Lunch and updated dashboard")
        argent_tap(udid, *COORDINATES["nutrition_log_btn"], "Tap '+ Log' button again")
        wait_until(68.0, recording_start, "Scene 3: Log Food Modal for search & barcode")
        argent_tap(udid, *COORDINATES["food_tab_search"], "Tap 'Search' Tab")
        wait_until(69.8, recording_start, "Scene 3: Inspecting USDA Whole Foods Search")
        argent_tap(udid, *COORDINATES["food_tab_barcode"], "Tap 'Barcode' Tab")
        wait_until(71.8, recording_start, "Scene 3: Inspecting Live Barcode Scanner")
        subprocess.run(f"adb -s {udid} shell input keyevent KEYCODE_BACK", shell=True)
        wait_until(72.5, recording_start, "Scene 3: Completing Phase 3")

        # ==========================================
        # SCENE 4: ADAPTIVE WORKOUT (73.4s - 89.5s)
        # ==========================================
        print("\n🎬 >>> SCENE 4: Adaptive Workout Progression & Progressive Overload")
        argent_tap(udid, *COORDINATES["tab_workout"], "Switch to Workout Tab")
        wait_until(75.5, recording_start, "Scene 4: Viewing Adaptive Split")
        argent_swipe(udid, 0.5, 0.75, 0.5, 0.45, 700, "Scroll down to exercises and logged sets")
        wait_until(83.5, recording_start, "Scene 4: Reviewing resistance progression")
        argent_swipe(udid, 0.5, 0.45, 0.5, 0.75, 700, "Scroll back to top of workout")
        wait_until(89.5, recording_start, "Scene 4: Completing Phase 4")

        # ==========================================
        # SCENE 5: UNIFIED ATHLETIC TELEMETRY (90.7s - 109.6s)
        # ==========================================
        print("\n🎬 >>> SCENE 5: Unified Athletic Telemetry & Open Source Outro")
        argent_tap(udid, *COORDINATES["tab_analyze"], "Switch to Analyze Tab")
        wait_until(94.0, recording_start, "Scene 5: Showing 7D Composite Performance Score")
        argent_tap(udid, *COORDINATES["analyze_subtab_recovery"], "Tap 'Recovery' sub-tab")
        wait_until(99.0, recording_start, "Scene 5: Showing recovery & sleep telemetry")
        argent_swipe(udid, 0.5, 0.75, 0.5, 0.45, 700, "Scroll down to volume & sets charts")
        wait_until(103.5, recording_start, "Scene 5: Showing volume metrics")
        argent_tap(udid, *COORDINATES["tab_coach"], "Switch to Coach for Final Heroic View")
        wait_until(total_target_time, recording_start, "Scene 5: Reaching Outro Finale")

    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted! Finalizing recording early...")

    # 5. Stop Argent Screen Recording
    print("\n⏹️  Stopping Argent Screen Recording and retrieving video...")
    stop_cmd = f"npx -y @swmansion/argent@latest run screen-recording-stop --udid {udid} --json"
    stop_res = json.loads(run_cmd(stop_cmd))
    video_path = stop_res.get("video")

    if not video_path or not os.path.exists(video_path):
        print(f"❌ Failed to retrieve video from Argent: {stop_res}")
        sys.exit(1)

    print(f"   🎉 Argent Recording Retrieved: {video_path}")
    print(f"   ⏱️  Trimmed Duration: {stop_res.get('durationMs', 0) / 1000:.2f}s")

    # 6. Run Composite with Argent Video
    print("\n🎨 Compositing Argent Video into Full HD 1080p Canvas with Narration...")
    composite_script = DEMO_DIR / "composite_pitch.py"
    subprocess.run([
        str(ROOT_DIR / "ml/venv/bin/python"),
        str(composite_script),
        "--video", video_path
    ], check=True)

    final_video = DEMO_DIR / "zerocoach_pitch_demo.mp4"
    print("\n🏆 DEMO VIDEO PRODUCTION COMPLETE!")
    print(f"   📺 Final Pitch Video: {final_video}")

if __name__ == "__main__":
    main()
