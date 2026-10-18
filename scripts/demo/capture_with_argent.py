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

def run_cmd(cmd):
    return subprocess.check_output(cmd, shell=True).decode()

def main():
    print("🎬 ==================================================")
    print("   ZeroCoach Demo Video Capture with Argent")
    print("====================================================\n")

    # 1. Discover connected devices via Argent
    print("🔍 Discovering connected devices via Argent...")
    try:
        devices_json = run_cmd("npx -y @swmansion/argent@latest run list-devices --json")
        data = json.loads(devices_json)
        devices = data.get("devices", [])
        if not devices:
            print("❌ No devices found! Please connect your phone via USB with USB debugging enabled.")
            sys.exit(1)
        udid = devices[0]["serial"]
        model = devices[0].get("model", "Android Device")
        print(f"   ✅ Found Target Device: {model} (Serial: {udid})\n")
    except Exception as e:
        print(f"❌ Failed to run Argent list-devices: {e}")
        sys.exit(1)

    # 2. Check timeline
    timeline_path = AUDIO_DIR / "timeline.json"
    if not timeline_path.exists():
        print("⚠️  timeline.json not found! Running generate_audio.py first...")
        subprocess.run(["python3", str(DEMO_DIR / "generate_audio.py")], check=True)

    with open(timeline_path) as f:
        timeline = json.load(f)

    total_time = sum(item["duration"] + 1.2 for item in timeline)

    print("📋 Storyboard Flow Instructions:")
    for t in timeline:
        print(f"   • Scene {t['scene']} ({t['duration']}s): {t['title']}")
    print(f"\nTotal Capture Duration: ~{round(total_time)}s\n")

    input("👉 Open ZeroCoach on your phone and press [ENTER] when ready to start recording...")

    # 3. Start Argent Screen Recording
    print("\n🔴 Starting Argent Screen Recording (30fps native, showTouches enabled)...")
    start_cmd = f"npx -y @swmansion/argent@latest run screen-recording-start --udid {udid} --timeLimitSeconds 300 --showTouches true --json"
    start_res = json.loads(run_cmd(start_cmd))
    print(f"   ✅ Argent Recording Active: Status = {start_res.get('status')}\n")

    # 4. Live Teleprompter & Countdown
    start_epoch = time.time()
    try:
        for idx, item in enumerate(timeline):
            s_num = item["scene"]
            dur = item["duration"] + 1.2
            s_title = item["title"]

            print(f"\n=======================================================")
            print(f"🎬 SCENE {s_num}/5: {s_title.upper()}")
            if s_num == 1:
                print("   Action: Show SETTINGS tab. Highlight Gemma 2 & On-Device Mode.")
            elif s_num == 2:
                print("   Action: Switch to COACH tab. Show Readiness score & send a question.")
            elif s_num == 3:
                print("   Action: Switch to NUTRITION tab. Show food snap & macro rings.")
            elif s_num == 4:
                print("   Action: Switch to WORKOUT tab. Show adaptive routine & sets.")
            elif s_num == 5:
                print("   Action: Show Settings or Coach summary. Final wrap-up.")
            print(f"=======================================================")

            scene_start = time.time()
            while time.time() - scene_start < dur:
                elapsed = time.time() - scene_start
                remaining = max(0, dur - elapsed)
                sys.stdout.write(f"\r⏳ Scene {s_num} Remaining: {remaining:.1f}s / {dur:.1f}s   ")
                sys.stdout.flush()
                time.sleep(0.2)
            print("\n   ✅ Scene completed!")

    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user! Finalizing recording...")

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
