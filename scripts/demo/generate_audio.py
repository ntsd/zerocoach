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

# Scene Script Definitions for Hacktoberfest Week 2: Side Hustle Challenge
SCENES = [
    {
        "id": 1,
        "name": "scene_1_privacy",
        "title": "Commercial Disruption & 0-Cloud Privacy",
        "text": "Personal trainers and fitness apps cost hundreds of dollars every year, locking your health insights behind monthly paywalls while harvesting your private biometric data. ZeroCoach changes the game. Built for the open-source community, ZeroCoach is a commercial-grade athletic coach that runs one hundred percent on your device. Powered by local GGUF models on your phone's neural processor, it eliminates cloud subscriptions, keeps your data completely sovereign, and works entirely offline.",
    },
    {
        "id": 2,
        "name": "scene_2_coach_chat",
        "title": "On-Device Athletic Intelligence & Streaming",
        "text": "Meet your on-device athletic coach. Powered by quantized Gemma 2 running directly on your phone, ZeroCoach streams adaptive advice at thirty-eight tokens per second. It factors in your sleep, recovery scores, and fatigue telemetry to deliver personalized coaching—without sending a single byte of your life to an external server.",
    },
    {
        "id": 3,
        "name": "scene_3_food_snap",
        "title": "Multimodal Food Log: AI Snap, Search & Barcode",
        "text": "Logging food has never been this effortless. With multimodal AI Plate Snap, upload or snap any meal. Our vision pipeline instantly identifies ingredients, calculates portion sizes, and decomposes exact macronutrients and micronutrients down to the gram. Need packaged items? ZeroCoach integrates instant USDA search and barcode scanning to make tracking automatic.",
    },
    {
        "id": 4,
        "name": "scene_4_workout",
        "title": "Adaptive Workout & Progressive Overload",
        "text": "In the gym, ZeroCoach replaces expensive personal trainers with dynamic, session-by-session progressive overload. Log weights and reps with zero friction, track your estimated one-rep max benchmarks, and let smart rest timers keep your training intensity primed for maximum strength gains.",
    },
    {
        "id": 5,
        "name": "scene_5_outro",
        "title": "Unified Athletic Telemetry & Open Source",
        "text": "Under the Analyze tab, ZeroCoach correlates your training volume, recovery scores, and daily nutrition into a single unified performance telemetry score. An enterprise-grade AI coach you would gladly pay for—built completely open source. Experience zero subscriptions and total data freedom at zerocoach.tech.",
    },
]

# Epic, resonant, movie-trailer pitch voice
NEURAL_VOICE = "en-US-GuyNeural"
VOICE_PITCH = "-4Hz"
VOICE_RATE = "+5%"

def synthesize_scene(scene):
    out_file = AUDIO_DIR / f"{scene['name']}.mp3"
    print(f"🎙️  Synthesizing Scene {scene['id']}: '{scene['title']}'...")
    
    cmd = [
        str(ROOT_DIR / "ml/venv/bin/edge-tts"),
        "--voice", NEURAL_VOICE,
        f"--rate={VOICE_RATE}",
        f"--pitch={VOICE_PITCH}",
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
