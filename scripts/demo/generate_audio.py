#!/usr/bin/env python3
import os
import sys
import json
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEMO_DIR = Path(__file__).resolve().parent
AUDIO_DIR = DEMO_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Scene Script Definitions from Blueprint
SCENES = [
    {
        "id": 1,
        "name": "scene_1_privacy",
        "title": "The Hook & Zero-Cloud Privacy",
        "text": "Every modern fitness tracker sends your most personal health, nutrition, and workout data straight into the cloud, locking insights behind paywalls and data harvesting. We built ZeroCoach: the world's first completely private, on-device AI athletic intelligence that runs 100% locally on your phone.",
    },
    {
        "id": 2,
        "name": "scene_2_coach_chat",
        "title": "On-Device Coach Chat & Streaming",
        "text": "Meet your personal coach. Powered by quantized Gemma 2 running directly on your phone's neural processor, ZeroCoach streams responses at thirty-eight tokens per second. It factors in your live Health Connect sleep and recovery metrics to give you biomechanically sound, personalized coaching—even in airplane mode.",
    },
    {
        "id": 3,
        "name": "scene_3_food_snap",
        "title": "Multimodal AI Food Snap & Macros",
        "text": "Forget tedious manual food logging. With AI Food Snap, simply snap a picture of any meal. Our multimodal vision pipeline instantly decomposes each ingredient, estimates precise portion weights, and logs exact macros to keep your daily nutritional targets perfectly dialed in.",
    },
    {
        "id": 4,
        "name": "scene_4_workout",
        "title": "Adaptive Workout & Progressive Overload",
        "text": "When you're ready to train, ZeroCoach provides dynamic, session-by-session progression. Log weights and reps with zero friction, track your estimated one-rep maximums, and let the smart rest timer keep your training intensity right where it belongs.",
    },
    {
        "id": 5,
        "name": "scene_5_outro",
        "title": "Tech Architecture & Visionary Outro",
        "text": "ZeroCoach proves that elite AI coaching doesn't require cloud servers or monthly subscriptions. Completely private, lightning fast, and always with you. Experience the future of athletic coaching at zerocoach.tech.",
    },
]

# High-energy, crisp tech narrator voice
NEURAL_VOICE = "en-US-ChristopherNeural"

def synthesize_scene(scene):
    out_file = AUDIO_DIR / f"{scene['name']}.mp3"
    print(f"🎙️  Synthesizing Scene {scene['id']}: '{scene['title']}'...")
    
    cmd = [
        str(ROOT_DIR / "ml/venv/bin/edge-tts"),
        "--voice", NEURAL_VOICE,
        "--rate=+6%",  # Slightly punchy, upbeat tech pitch pace
        "--text", scene["text"],
        "--write-media", str(out_file),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)
    
    # Measure duration with ffprobe
    duration_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(out_file)
    ]
    duration = float(subprocess.check_output(duration_cmd).decode().strip())
    print(f"   ✅ Saved {scene['name']}.mp3 ({duration:.2f}s)")
    
    return {
        **scene,
        "file": str(out_file),
        "duration": duration,
    }

def main():
    print(f"🚀 Generating Neural Pitch Voiceover Track ({NEURAL_VOICE})...\n")
    
    results = []
    for scene in SCENES:
        result = synthesize_scene(scene)
        results.append(result)
        
    print("\n🔗 Stitching full master audio track with scene pauses...")
    silence_file = AUDIO_DIR / "silence_1s.mp3"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-t", "1.2", "-q:a", "9", "-acodec", "libmp3lame", str(silence_file)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    concat_list = AUDIO_DIR / "concat_list.txt"
    cumulative_time = 0.0
    timeline = []
    
    with open(concat_list, "w") as f:
        for i, r in enumerate(results):
            f.write(f"file '{r['file']}'\n")
            timeline.append({
                "scene": r["id"],
                "title": r["title"],
                "startTime": round(cumulative_time, 2),
                "duration": round(r["duration"], 2),
                "endTime": round(cumulative_time + r["duration"], 2),
            })
            cumulative_time += r["duration"]
            if i < len(results) - 1:
                f.write(f"file '{silence_file}'\n")
                cumulative_time += 1.2

    full_audio = AUDIO_DIR / "full_narration.mp3"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list), "-c", "copy", str(full_audio)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    total_duration = float(subprocess.check_output([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(full_audio)
    ]).decode().strip())
    
    timeline_file = AUDIO_DIR / "timeline.json"
    with open(timeline_file, "w") as f:
        json.dump(timeline, f, indent=2)
        
    print(f"\n🎉 Master Narration Assembled: {full_audio}")
    print(f"Total Video Narration Time: {total_duration:.2f}s (~{round(total_duration)}s)\n")
    print("📋 Scene Timing Matrix:")
    for t in timeline:
        print(f"   Scene {t['scene']}: {t['startTime']}s -> {t['endTime']}s ({t['duration']}s) | {t['title']}")

if __name__ == "__main__":
    main()
