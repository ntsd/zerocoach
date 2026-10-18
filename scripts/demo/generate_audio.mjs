import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const AUDIO_DIR = path.join(__dirname, 'audio');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// 1. Read ElevenLabs API Key from .env
const envPath = path.join(ROOT_DIR, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const keyMatch = envContent.match(/ELEVENLABS_API_KEY=(.+)/);
if (!keyMatch) {
  console.error('Error: ELEVENLABS_API_KEY not found in .env.');
  process.exit(1);
}

const API_KEY = keyMatch[1].trim().replace(/^["']|["']$/g, '');

// Voice: Charlie (Deep, Confident, Energetic)
const VOICE_ID = 'IKne3meq5aSn9XLyUdCD';
const MODEL_ID = 'eleven_turbo_v2_5';

const SCENES = [
  {
    id: 1,
    name: 'scene_1_privacy',
    title: 'The Hook & Zero-Cloud Privacy',
    text: "Every modern fitness tracker sends your most personal health, nutrition, and workout data straight into the cloud—locking insights behind paywalls and data harvesting. We built ZeroCoach: the world's first completely private, on-device AI athletic intelligence that runs 100% locally on your phone.",
  },
  {
    id: 2,
    name: 'scene_2_coach_chat',
    title: 'On-Device Coach Chat & Streaming',
    text: "Meet your personal coach. Powered by quantized Gemma 2 running directly on your phone's neural processor, ZeroCoach streams responses at thirty-eight tokens per second. It factors in your live Health Connect sleep and recovery metrics to give you biomechanically sound, personalized coaching—even in airplane mode.",
  },
  {
    id: 3,
    name: 'scene_3_food_snap',
    title: 'Multimodal AI Food Snap & Macros',
    text: "Forget tedious manual food logging. With AI Food Snap, simply snap a picture of any meal. Our multimodal vision pipeline instantly decomposes each ingredient, estimates precise portion weights, and logs exact macros to keep your daily nutritional targets perfectly dialed in.",
  },
  {
    id: 4,
    name: 'scene_4_workout',
    title: 'Adaptive Workout & Progressive Overload',
    text: "When you're ready to train, ZeroCoach provides dynamic, session-by-session progression. Log weights and reps with zero friction, track your estimated one-rep maximums, and let the smart rest timer keep your training intensity right where it belongs.",
  },
  {
    id: 5,
    name: 'scene_5_outro',
    title: 'Tech Architecture & Visionary Outro',
    text: "ZeroCoach proves that elite AI coaching doesn't require cloud servers or monthly subscriptions. Completely private, lightning fast, and always with you. Experience the future of athletic coaching at zerocoach.tech.",
  },
];

async function synthesizeScene(scene) {
  const outputPath = path.join(AUDIO_DIR, `${scene.name}.mp3`);
  console.log(`🎙️  Synthesizing Scene ${scene.id}: "${scene.title}"...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: scene.text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

  // Measure audio duration using ffprobe
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
  )
    .toString()
    .trim();
  const duration = parseFloat(durationStr);

  console.log(`   ✅ Saved to ${scene.name}.mp3 (Duration: ${duration.toFixed(2)}s)`);
  return { ...scene, file: outputPath, duration };
}

async function main() {
  console.log('🚀 Starting ElevenLabs Pitch Voiceover Generation...');
  console.log(`Voice ID: ${VOICE_ID} (Charlie - Energetic Tech Pitch)\n`);

  const results = [];
  for (const scene of SCENES) {
    const result = await synthesizeScene(scene);
    results.push(result);
  }

  // Create concatenated timeline audio with 1.2s silence between scenes
  console.log('\n🔗 Assembling full narration track with scene pauses...');
  const silenceFile = path.join(AUDIO_DIR, 'silence_1s.mp3');
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 1.2 -q:a 9 -acodec libmp3lame "${silenceFile}" 2>/dev/null`
  );

  const concatListPath = path.join(AUDIO_DIR, 'concat_list.txt');
  let concatContent = '';
  let cumulativeTime = 0;
  const timeline = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    concatContent += `file '${path.resolve(r.file)}'\n`;
    timeline.push({
      scene: r.id,
      title: r.title,
      startTime: cumulativeTime,
      duration: r.duration,
      endTime: cumulativeTime + r.duration,
    });
    cumulativeTime += r.duration;

    if (i < results.length - 1) {
      concatContent += `file '${path.resolve(silenceFile)}'\n`;
      cumulativeTime += 1.2;
    }
  }

  fs.writeFileSync(concatListPath, concatContent);

  const fullAudioPath = path.join(AUDIO_DIR, 'full_narration.mp3');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${fullAudioPath}" 2>/dev/null`);

  const totalDuration = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullAudioPath}"`)
      .toString()
      .trim()
  );

  console.log(`\n🎉 Full Narration Assembled: ${fullAudioPath}`);
  console.log(`Total Narration Duration: ${totalDuration.toFixed(2)}s (~${Math.round(totalDuration)}s)\n`);

  console.log('📋 Synchronized Scene Timeline:');
  console.table(
    timeline.map((t) => ({
      Scene: t.scene,
      Title: t.title,
      'Start (s)': t.startTime.toFixed(2),
      'End (s)': t.endTime.toFixed(2),
      'Duration (s)': t.duration.toFixed(2),
    }))
  );

  const timelineJsonPath = path.join(AUDIO_DIR, 'timeline.json');
  fs.writeFileSync(timelineJsonPath, JSON.stringify(timeline, null, 2));
  console.log(`\nTimeline metadata saved to ${timelineJsonPath}`);
}

main().catch((err) => {
  console.error('Fatal generation error:', err);
  process.exit(1);
});
