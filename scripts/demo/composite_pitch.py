#!/usr/bin/env python3
import os
import sys
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEMO_DIR = Path(__file__).resolve().parent
AUDIO_DIR = DEMO_DIR / "audio"
SCENES_DIR = DEMO_DIR / "scenes"
OUTPUT_DIR = DEMO_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH = 1920
HEIGHT = 1080
FPS = 30

# Brand Palette
BG_DARK = (10, 15, 29)          # #0A0F1D
BG_SURFACE = (18, 25, 43)       # #12192B
CARD_BG = (15, 23, 42)          # #0F172A
CARD_BORDER = (30, 41, 59)      # #1E293B
CYAN = (0, 229, 255)            # #00E5FF
CYAN_GLOW = (0, 229, 255, 60)
EMERALD = (16, 185, 129)        # #10B981
AMBER = (245, 158, 11)          # #F59E0B
TEXT_WHITE = (248, 250, 252)    # #F8FAFC
TEXT_MUTED = (148, 163, 184)    # #94A3B8
TEXT_SECONDARY = (203, 213, 225)# #CBD5E1

SCENE_METADATA = {
    1: {
        "tag": "PHASE 01: ZERO-CLOUD PRIVACY",
        "tag_color": CYAN,
        "title": "Local GGUF Weights via llama.rn",
        "subtitle": "No subscriptions. No trackers. 100% on-device AI.",
        "bullets": [
            ("LOCAL INTELLIGENCE", "Health, nutrition, and chat data never leave your phone"),
            ("GPU ACCELERATED", "Quantized GGUF runs on Metal & OpenCL with 0 cloud calls"),
            ("MULTI-MODEL ARCHITECTURE", "Gemma 2 (2B Instruct) & Fine-Tuned ZeroCoach Athletic"),
        ]
    },
    2: {
        "tag": "PHASE 02: REAL-TIME STREAMING",
        "tag_color": EMERALD,
        "title": "On-Device Inference (~38 Tok/s)",
        "subtitle": "Blazing conversational intelligence directly in your pocket.",
        "bullets": [
            ("INSTANT STREAMING", "Low-latency generation powered by local mobile hardware"),
            ("HEALTH CONNECT SYNC", "Live sleep, heart rate, and fatigue readiness scoring"),
            ("STRICT VS COMFORT", "Switchable coach personas for discipline or encouragement"),
        ]
    },
    3: {
        "tag": "PHASE 03: MULTIMODAL COMPUTER VISION",
        "tag_color": AMBER,
        "title": "AI Food Snap & Macro Decomposition",
        "subtitle": "Multimodal visual intelligence meets precision nutrition.",
        "bullets": [
            ("SINGLE PHOTO SNAP", "Recognizes meals, ingredients, and estimates portion weights"),
            ("EXACT MACRO BREAKDOWN", "Calculates protein, carbs, fats, and calories instantly"),
            ("AUTOMATIC BUDGET SYNC", "Real-time daily remaining nutrition target updates"),
        ]
    },
    4: {
        "tag": "PHASE 04: ADAPTIVE WORKOUT",
        "tag_color": CYAN,
        "title": "Progressive Overload & Live Sets",
        "subtitle": "Science-backed resistance training that adapts to your recovery.",
        "bullets": [
            ("DYNAMIC PROGRESSION", "Personalized volume and weight progression curves"),
            ("SMART REST TIMERS", "Haptic countdown timers to keep intensity calibrated"),
            ("1RM BENCHMARKING", "Automatic personal record tracking and strength analytics"),
        ]
    },
    5: {
        "tag": "PHASE 05: OPEN SOURCE & LOCAL FUTURE",
        "tag_color": EMERALD,
        "title": "The Future of Athletic Intelligence",
        "subtitle": "Enterprise-grade intelligence with zero cloud dependency.",
        "bullets": [
            ("MODERN TECH STACK", "React Native + llama.rn + Gemma 2 + Gemini Vision"),
            ("100% OFFLINE CAPABLE", "Train in the gym, on the trail, or in airplane mode"),
            ("OPEN SOURCE REPOSITORY", "Available on GitHub: github.com/ntsd/zerocoach"),
        ]
    }
}

# Fonts
def get_font(size, bold=False):
    font_paths = [
        "/System/Library/Fonts/SFNS.ttf" if not bold else "/System/Library/Fonts/SFNSBold.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf" if not bold else "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def render_scene_frame(scene_id, progress=0.0):
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)

    # 1. Subtle Background Grid & Glows
    for y in range(0, HEIGHT, 60):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 23, 42), width=1)
    for x in range(0, WIDTH, 60):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 23, 42), width=1)

    # Radial ambient glow near phone mockup
    # Left side phone mockup placement: x=140, y=60, w=432, h=960
    phone_x = 130
    phone_y = 60
    phone_w = 440
    phone_h = 960

    # Draw Phone Bezel & Shadow
    shadow_offset = 12
    draw.rounded_rectangle(
        [phone_x - 14 + shadow_offset, phone_y - 14 + shadow_offset, 
         phone_x + phone_w + 14 + shadow_offset, phone_y + phone_h + 14 + shadow_offset],
        radius=44,
        fill=(5, 8, 16)
    )
    # Outer Bezel
    draw.rounded_rectangle(
        [phone_x - 10, phone_y - 10, phone_x + phone_w + 10, phone_y + phone_h + 10],
        radius=42,
        fill=(26, 32, 44),
        outline=(56, 189, 248, 80),
        width=2
    )

    # 2. Paste Screen Image
    scene_img_path = SCENES_DIR / f"scene_{scene_id}.png"
    if scene_img_path.exists():
        screen = Image.open(scene_img_path).convert("RGBA")
        screen = screen.resize((phone_w, phone_h), Image.Resampling.LANCZOS)
        
        # Round the corners of screen
        mask = Image.new("L", (phone_w, phone_h), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([0, 0, phone_w, phone_h], radius=32, fill=255)
        
        img.paste(screen, (phone_x, phone_y), mask)

    # Speaker notch at top
    draw.rounded_rectangle(
        [phone_x + phone_w//2 - 40, phone_y + 10, phone_x + phone_w//2 + 40, phone_y + 16],
        radius=3,
        fill=(10, 15, 29)
    )

    # 3. Right Side: Brand & Feature Presentation (x=660 to 1820)
    rx = 670

    # Brand Pill
    f_brand = get_font(13, bold=True)
    draw.rounded_rectangle([rx, 78, rx + 265, 114], radius=18, fill=(12, 34, 52), outline=CYAN, width=1)
    draw.text((rx + 20, 88), "ZEROCOACH • ON-DEVICE AI", font=f_brand, fill=CYAN)

    # Main Pitch Title
    f_main = get_font(42, bold=True)
    draw.text((rx, 134), "World's First 100% On-Device AI Coach", font=f_main, fill=TEXT_WHITE)

    f_sub = get_font(18, bold=False)
    draw.text((rx, 192), "Zero Cloud Telemetry • Local GGUF Weights via llama.rn • Multimodal Vision", font=f_sub, fill=TEXT_MUTED)

    # Divider Line
    draw.line([(rx, 230), (rx + 1150, 230)], fill=CARD_BORDER, width=1)

    # Dynamic Scene Info Box
    meta = SCENE_METADATA.get(scene_id, SCENE_METADATA[1])

    card_y = 260
    card_w = 1150
    card_h = 580

    # Scene Card Container
    draw.rounded_rectangle(
        [rx, card_y, rx + card_w, card_y + card_h],
        radius=20,
        fill=CARD_BG,
        outline=CARD_BORDER,
        width=1
    )

    # Phase Badge
    f_tag = get_font(15, bold=True)
    tag_color = meta["tag_color"]
    draw.rounded_rectangle(
        [rx + 36, card_y + 36, rx + 36 + len(meta["tag"])*10 + 20, card_y + 70],
        radius=8,
        fill=(tag_color[0], tag_color[1], tag_color[2]),
        outline=tag_color,
        width=1
    )
    draw.text((rx + 48, card_y + 44), meta["tag"], font=f_tag, fill=(10, 15, 29))

    # Scene Title
    f_stitle = get_font(34, bold=True)
    draw.text((rx + 36, card_y + 90), meta["title"], font=f_stitle, fill=TEXT_WHITE)

    # Scene Subtitle
    f_ssub = get_font(18, bold=False)
    draw.text((rx + 36, card_y + 138), meta["subtitle"], font=f_ssub, fill=TEXT_SECONDARY)

    # Bullets
    by = card_y + 195
    f_btag = get_font(12, bold=True)
    f_bbody = get_font(16, bold=False)

    for tag_label, desc in meta["bullets"]:
        # Bullet Box
        draw.rounded_rectangle(
            [rx + 36, by, rx + card_w - 36, by + 90],
            radius=12,
            fill=BG_SURFACE,
            outline=(30, 41, 59),
            width=1
        )
        tag_w = int(len(tag_label) * 8.5) + 20
        draw.rounded_rectangle(
            [rx + 56, by + 16, rx + 56 + tag_w, by + 40],
            radius=6,
            fill=(14, 38, 58),
            outline=CYAN,
            width=1
        )
        draw.text((rx + 66, by + 21), tag_label, font=f_btag, fill=CYAN)
        draw.text((rx + 56, by + 52), desc, font=f_bbody, fill=TEXT_SECONDARY)
        by += 110

    # 4. Bottom Timeline Indicator & Progress Bar (y=880 to 980)
    timeline_y = 880
    f_tl = get_font(14, bold=True)
    draw.text((rx, timeline_y), f"SCENE 0{scene_id} / 05  •  HACKATHON DEMO TIMELINE", font=f_tl, fill=TEXT_MUTED)

    # Progress bar background
    pbar_w = 1150
    draw.rounded_rectangle([rx, timeline_y + 26, rx + pbar_w, timeline_y + 34], radius=4, fill=(30, 41, 59))

    # Active progress bar fill
    fill_w = int(pbar_w * ((scene_id - 1 + progress) / 5.0))
    if fill_w > 0:
        draw.rounded_rectangle([rx, timeline_y + 26, rx + fill_w, timeline_y + 34], radius=4, fill=CYAN)

    # Scene tick markers
    for i in range(1, 6):
        tx = rx + int(pbar_w * ((i - 1) / 5.0))
        draw.rectangle([tx, timeline_y + 24, tx + 2, timeline_y + 36], fill=(71, 85, 105))

    return img

def main():
    timeline_path = AUDIO_DIR / "timeline.json"
    if not timeline_path.exists():
        print("Error: timeline.json not found. Run generate_audio.py first.")
        sys.exit(1)

    with open(timeline_path) as f:
        timeline = json.load(f)

    print("🚀 Rendering High-Resolution 1080p Canvas Frames for each scene...")

    scene_clips = []
    for item in timeline:
        s_id = item["scene"]
        dur = item["duration"] + 1.2 # include pause
        frame_img = render_scene_frame(s_id, progress=1.0)
        frame_path = OUTPUT_DIR / f"frame_scene_{s_id}.png"
        frame_img.save(frame_path)
        print(f"   🖼️  Rendered Frame Scene {s_id} -> {frame_path}")

        # Create video clip with ffmpeg
        clip_path = OUTPUT_DIR / f"clip_scene_{s_id}.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(frame_path),
            "-t", str(dur),
            "-c:v", "libx264", "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-r", str(FPS),
            str(clip_path)
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"   🎬 Generated Clip Scene {s_id} ({dur:.2f}s) -> {clip_path}")
        scene_clips.append(str(clip_path))

    # Concat video clips
    print("\n🔗 Stitching 5 video clips together...")
    concat_list = OUTPUT_DIR / "video_concat_list.txt"
    with open(concat_list, "w") as f:
        for c in scene_clips:
            f.write(f"file '{c}'\n")

    video_only = OUTPUT_DIR / "video_track.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list), "-c", "copy", str(video_only)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Merge with Master Narration Audio Track
    print("🎵 Merging video track with full narration audio track...")
    audio_track = AUDIO_DIR / "full_narration.mp3"
    final_output = DEMO_DIR / "zerocoach_pitch_demo.mp4"

    cmd_final = [
        "ffmpeg", "-y",
        "-i", str(video_only),
        "-i", str(audio_track),
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(final_output)
    ]
    subprocess.run(cmd_final, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Get final file details
    v_dur = float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(final_output)
    ]).decode().strip())
    v_size = os.path.getsize(final_output) / (1024 * 1024)

    print(f"\n🏆 SUCCESS! ZeroCoach Pitch Demo Video created:")
    print(f"   📁 Path: {final_output}")
    print(f"   ⏱️  Duration: {v_dur:.2f}s (~{round(v_dur)}s)")
    print(f"   📦 Size: {v_size:.2f} MB")
    print(f"   📺 Resolution: 1920x1080 (16:9 Full HD)")

if __name__ == "__main__":
    main()
