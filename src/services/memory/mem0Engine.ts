import {
  MemoryCategory,
  MemoryCandidate,
  MemoryItem,
  MemoryReconciliationResult,
} from '@/types/memory';

const MAX_MEMORIES = 50;

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'i', 'me', 'my', 'mine', 'myself', 'you', 'your', 'user', 'athlete',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'and', 'or', 'but', 'so', 'very', 'really', 'just', 'also', 'too',
  'that', 'this', 'it', 'have', 'has', 'had', 'do', 'does', 'did',
  'am', 'can', 'will', 'would', 'should', 'could',
  'ฉัน', 'ผม', 'เรา', 'คือ', 'เป็น', 'ที่', 'ใน', 'ของ', 'และ', 'หรือ', 'มาก', 'เลย', 'ครับ', 'ค่ะ', 'นะ',
]);

export function inferCategoryFromContent(text: string): MemoryCategory {
  const lower = (text || '').toLowerCase().trim();
  if (
    /\b(injur\w*|limit\w*|pain|hurt\w*|sore\w*|impingement|tendonitis|strain|sprain|recover\w*|acl|meniscus|rotator\s+cuff|sciatica|surgery)\b/.test(
      lower
    ) ||
    /เจ็บ|ปวด|บาดเจ็บ|ข้อต่อ|หัวเข่า|ไหล่|ข้อมือ|หลัง/.test(lower)
  ) {
    return 'injury_limitation';
  }
  if (
    /\b(food|diet\w*|nutrition|meal|eat\w*|allerg\w*|intoleran\w*|vegan|vegetarian|keto|halal|protein|calorie\w*|macro\w*|breakfast|lunch|dinner|snack|chicken|beef|pork|salmon|fish|rice|egg\w*|milk|dairy|peanut\w*|seafood|coffee)\b/.test(
      lower
    ) ||
    /อาหาร|กิน|ทาน|มื้อ|แพ้|มังสวิรัติ|คีโต|ฮาลาล|โปรตีน|แคลอรี่|ข้าว|ไก่|ปลา|ไข่/.test(lower)
  ) {
    return 'food_preference';
  }
  if (
    /\b(workout\w*|skill\w*|exercise\w*|train\w*|calisthenics|gym|movement\w*|equipment|pull[- ]?ups?|chin[- ]?ups?|push[- ]?ups?|dips?|muscle[- ]?ups?|planche|lever|handstand|l-sit|squats?|deadlifts?|bench|lunges?|burpees?|cardio|run\w*|bar|bars|dumbbell\w*|barbell\w*|kettlebell\w*|rings|parallettes|bands?|cable|weights?)\b/.test(
      lower
    ) ||
    /ซ้อม|ออกกำลัง|ท่า|สกิล|ยิม|เวท|บาร์โหน|ดึงข้อ|วิดพื้น|ดัมเบล|บาร์เบล|คาร์ดิโอ|วิ่ง/.test(lower)
  ) {
    return 'workout_preference';
  }
  return 'personality_style';
}

export function normalizeMemoryCategory(raw?: string): MemoryCategory {
  if (!raw) return 'personality_style';
  const lower = raw.toLowerCase().trim();
  if (
    lower === 'food_preference' ||
    lower === 'workout_preference' ||
    lower === 'injury_limitation' ||
    lower === 'personality_style'
  ) {
    return lower;
  }
  return inferCategoryFromContent(lower);
}

export function tokenizeMemoryText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function inferMemoryTopic(category: MemoryCategory, content: string, explicitTopic?: string): string {
  if (explicitTopic && explicitTopic.trim().length > 0) {
    return explicitTopic
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .replace(/^_+|_+$/g, '');
  }

  const lower = content.toLowerCase();

  if (category === 'injury_limitation') {
    if (/shoulder|rotator|deltoid|ไหล่/.test(lower)) return 'injury_shoulder';
    if (/knee|meniscus|acl|patella|เข่า/.test(lower)) return 'injury_knee';
    if (/wrist|forearm|carpal|ข้อมือ/.test(lower)) return 'injury_wrist';
    if (/back|spine|lumbar|sciatica|หลัง/.test(lower)) return 'injury_back';
    if (/elbow|tendonitis|golfer|tennis|ข้อศอก/.test(lower)) return 'injury_elbow';
    if (/ankle|achilles|foot|ข้อเท้า/.test(lower)) return 'injury_ankle';
    if (/neck|cervical|คอ/.test(lower)) return 'injury_neck';
    if (/hip|groin|สะโพก/.test(lower)) return 'injury_hip';
  }

  if (category === 'food_preference') {
    if (/allerg|intoleran|แพ้/.test(lower)) return 'food_allergy';
    if (/vegan|vegetarian|keto|carnivore|halal|pescatarian|มังสวิรัติ|คีโต|ฮาลาล/.test(lower)) {
      return 'dietary_pattern';
    }
    if (/hate|dislike|avoid|don't eat|ไม่กิน|ไม่ชอบกิน|เกลียด/.test(lower)) {
      const tokens = tokenizeMemoryText(content).slice(0, 3).join('_');
      return `disliked_food_${tokens || 'item'}`;
    }
    if (/favorite food|favourite food|อาหารที่ชอบ|ของโปรด/.test(lower)) {
      return 'favorite_food';
    }
  }

  if (category === 'workout_preference') {
    if (/favorite skill|favourite skill|target skill|dream skill|สกิลที่ชอบ|ท่าที่อยากฝึก/.test(lower)) {
      return 'favorite_skill';
    }
    if (/favorite exercise|favourite exercise|favorite workout|favorite movement|ท่าที่ชอบ|ชอบเล่นท่า/.test(lower)) {
      return 'favorite_exercise';
    }
    if (/hate|dislike|avoid|never do|เกลียดท่า|ไม่ชอบเล่น/.test(lower)) {
      const tokens = tokenizeMemoryText(content).slice(0, 3).join('_');
      return `disliked_exercise_${tokens || 'item'}`;
    }
  }

  if (category === 'personality_style') {
    if (/morning|evening|night|schedule|time|ตอนเช้า|ตอนเย็น|ดึก/.test(lower)) {
      return 'training_schedule';
    }
    if (/tone|style|strict|chill|direct|encourag|พูดแบบ|สไตล์/.test(lower)) {
      return 'coaching_style';
    }
  }

  const keyTokens = tokenizeMemoryText(content).slice(0, 3);
  return keyTokens.length > 0 ? `${category}_${keyTokens.join('_')}` : `${category}_fact`;
}

export function computeMemorySimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) {
    const ratio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
    if (ratio > 0.65) return 0.9;
  }

  const tokensA = new Set(tokenizeMemoryText(a));
  const tokensB = new Set(tokenizeMemoryText(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function isNegationOrRecoveryStatement(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    /\b(no longer|recovered from|healed|doesn't hurt anymore|does not hurt anymore|pain is gone|not allergic|forget that)\b/.test(
      lower
    ) || /หายเจ็บ|หายปวด|ไม่เจ็บแล้ว|ไม่ปวดแล้ว|ลืมเรื่อง/.test(lower)
  );
}

/**
 * Core Mem0-style reconciliation loop:
 * Evaluates a candidate fact against existing memories and resolves to ADD, UPDATE, DELETE, or NOOP.
 */
export function reconcileMemory(
  existingMemories: MemoryItem[],
  candidate: MemoryCandidate
): {
  memories: MemoryItem[];
  result: MemoryReconciliationResult;
} {
  const cleanContent = candidate.content.trim().replace(/\s+/g, ' ');
  if (!cleanContent) {
    return {
      memories: existingMemories,
      result: {
        operation: 'NOOP',
        summary: 'Empty memory ignored.',
      },
    };
  }

  const category = normalizeMemoryCategory(candidate.category);
  const topic = inferMemoryTopic(category, cleanContent, candidate.topic);
  const now = Date.now();

  // 1. Check if this is an explicit DELETE or a recovery/negation of an existing memory
  if (candidate.operationHint === 'DELETE' || isNegationOrRecoveryStatement(cleanContent)) {
    const target = existingMemories.find(
      (m) =>
        m.topic === topic ||
        (m.category === category && computeMemorySimilarity(m.content, cleanContent) >= 0.4)
    );
    if (target) {
      const filtered = existingMemories.filter((m) => m.id !== target.id);
      return {
        memories: filtered,
        result: {
          operation: 'DELETE',
          removedId: target.id,
          previousContent: target.content,
          summary: `Removed outdated memory: "${target.content}"`,
        },
      };
    }
    if (candidate.operationHint === 'DELETE') {
      return {
        memories: existingMemories,
        result: {
          operation: 'NOOP',
          summary: 'No matching memory found to delete.',
        },
      };
    }
  }

  // 2. Check for exact or near-exact duplicate -> NOOP
  const exactMatch = existingMemories.find(
    (m) => m.category === category && computeMemorySimilarity(m.content, cleanContent) >= 0.85
  );
  if (exactMatch) {
    return {
      memories: existingMemories,
      result: {
        operation: 'NOOP',
        item: exactMatch,
        summary: `Already remembered: "${exactMatch.content}"`,
      },
    };
  }

  // 3. Check for topic match or high semantic overlap in same category -> UPDATE
  const topicOrOverlapIndex = existingMemories.findIndex(
    (m) =>
      m.category === category &&
      (m.topic === topic || computeMemorySimilarity(m.content, cleanContent) >= 0.58)
  );

  if (topicOrOverlapIndex !== -1) {
    const prev = existingMemories[topicOrOverlapIndex];
    const updatedItem: MemoryItem = {
      ...prev,
      topic,
      content: cleanContent,
      source: candidate.source || prev.source,
      updatedAt: now,
    };
    const nextMemories = [...existingMemories];
    nextMemories[topicOrOverlapIndex] = updatedItem;

    return {
      memories: nextMemories,
      result: {
        operation: 'UPDATE',
        item: updatedItem,
        previousContent: prev.content,
        summary: `Updated memory: "${cleanContent}"`,
      },
    };
  }

  // 4. Otherwise -> ADD new atomic fact
  const newItem: MemoryItem = {
    id: `mem-${now}-${Math.random().toString(36).substring(2, 6)}`,
    category,
    topic,
    content: cleanContent,
    source: candidate.source || 'agent',
    createdAt: now,
    updatedAt: now,
  };

  let nextMemories = [newItem, ...existingMemories];
  if (nextMemories.length > MAX_MEMORIES) {
    // Keep highest-priority categories (injury_limitation) and most recently updated
    nextMemories = nextMemories
      .sort((a, b) => {
        if (a.category === 'injury_limitation' && b.category !== 'injury_limitation') return -1;
        if (b.category === 'injury_limitation' && a.category !== 'injury_limitation') return 1;
        return b.updatedAt - a.updatedAt;
      })
      .slice(0, MAX_MEMORIES);
  }

  return {
    memories: nextMemories,
    result: {
      operation: 'ADD',
      item: newItem,
      summary: `Remembered: "${cleanContent}"`,
    },
  };
}

/**
 * Deletes a memory by exact ID or best keyword/topic match.
 */
export function deleteMemoryByQuery(
  existingMemories: MemoryItem[],
  idOrQuery: string
): {
  memories: MemoryItem[];
  result: MemoryReconciliationResult;
} {
  const clean = idOrQuery.trim();
  if (!clean) {
    return {
      memories: existingMemories,
      result: { operation: 'NOOP', summary: 'No memory ID or query provided.' },
    };
  }

  // 1. Direct ID or exact topic match
  const byIdOrTopic = existingMemories.find(
    (m) => m.id === clean || m.topic.toLowerCase() === clean.toLowerCase()
  );
  if (byIdOrTopic) {
    return {
      memories: existingMemories.filter((m) => m.id !== byIdOrTopic.id),
      result: {
        operation: 'DELETE',
        removedId: byIdOrTopic.id,
        previousContent: byIdOrTopic.content,
        summary: `Forgot memory: "${byIdOrTopic.content}"`,
      },
    };
  }

  // 2. Substring or token similarity match
  const lower = clean.toLowerCase();
  let bestMatch: MemoryItem | undefined;
  let bestScore = 0;

  for (const m of existingMemories) {
    if (m.content.toLowerCase().includes(lower) || m.topic.toLowerCase().includes(lower)) {
      bestMatch = m;
      bestScore = 1;
      break;
    }
    const sim = computeMemorySimilarity(m.content, clean);
    if (sim > bestScore) {
      bestScore = sim;
      bestMatch = m;
    }
  }

  if (bestMatch && bestScore >= 0.3) {
    return {
      memories: existingMemories.filter((m) => m.id !== bestMatch!.id),
      result: {
        operation: 'DELETE',
        removedId: bestMatch.id,
        previousContent: bestMatch.content,
        summary: `Forgot memory: "${bestMatch.content}"`,
      },
    };
  }

  return {
    memories: existingMemories,
    result: {
      operation: 'NOOP',
      summary: `No matching memory found for "${clean}".`,
    },
  };
}

/**
 * Retrieves memories relevant to the current user query using structured category rules:
 * - Always includes `injury_limitation` and `personality_style`
 * - Ranks `food_preference` and `workout_preference` by query overlap + recency
 */
export function retrieveRelevantMemories(
  memories: MemoryItem[],
  query?: string,
  maxItems: number = 10
): MemoryItem[] {
  if (!memories || memories.length === 0) return [];
  if (memories.length <= maxItems && !query) return memories;

  const queryTokens = new Set(tokenizeMemoryText(query || ''));
  const isFoodQuery =
    query &&
    /\b(eat|food|meal|hungry|breakfast|lunch|dinner|snack|macro|protein|calorie|diet|cook|dish|กิน|อาหาร|มื้อ|หิว|โปรตีน|แคล)\b/i.test(
      query
    );
  const isWorkoutQuery =
    query &&
    /\b(workout|train|exercise|set|rep|skill|plan|split|gym|pull|push|leg|calisthenics|ซ้อม|ออกกำลัง|ท่า|ตาราง|เวท)\b/i.test(
      query
    );

  const scored = memories.map((m) => {
    let score = 0;

    // Standing constraints and personality always get high base priority
    if (m.category === 'injury_limitation') score += 100;
    if (m.category === 'personality_style') score += 70;

    // Domain boost based on current conversation topic
    if (isFoodQuery && m.category === 'food_preference') score += 60;
    if (isWorkoutQuery && m.category === 'workout_preference') score += 60;

    // Base score for preferences even on general turns so the coach knows the person
    if (m.category === 'food_preference' || m.category === 'workout_preference') {
      score += 40;
    }

    // Lexical / BM25-lite overlap with current query
    if (queryTokens.size > 0) {
      const memTokens = tokenizeMemoryText(m.content);
      for (const t of memTokens) {
        if (queryTokens.has(t)) score += 25;
      }
    }

    // Slight recency tie-breaker
    score += Math.min(10, (m.updatedAt / 1e12));

    return { item: m, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((s) => s.item);
}

/**
 * Formats stored memories into a structured section for full cloud/remote system prompts.
 */
export function formatMemoriesForFullPrompt(memories: MemoryItem[], query?: string): string {
  const selected = retrieveRelevantMemories(memories, query, 16);
  if (selected.length === 0) {
    return `- ATHLETE MEMORY & PERSONALITY (MEM0 LAYER):
  * No personal preferences stored yet. If the athlete mentions their favorite foods, dietary restrictions, favorite workout skills/exercises, injuries, or personality/schedule preferences, call save_memory to remember them.`;
  }

  const byCat: Record<MemoryCategory, string[]> = {
    food_preference: [],
    workout_preference: [],
    injury_limitation: [],
    personality_style: [],
  };

  for (const m of selected) {
    byCat[m.category].push(m.content);
  }

  const lines: string[] = ['- ATHLETE MEMORY & PERSONALITY (MEM0 LAYER):'];
  if (byCat.personality_style.length > 0) {
    lines.push(`  * Personality & Lifestyle: ${byCat.personality_style.join(' | ')}`);
  }
  if (byCat.food_preference.length > 0) {
    lines.push(`  * Food & Dietary Preferences: ${byCat.food_preference.join(' | ')}`);
  }
  if (byCat.workout_preference.length > 0) {
    lines.push(`  * Favorite Skills & Workout Preferences: ${byCat.workout_preference.join(' | ')}`);
  }
  if (byCat.injury_limitation.length > 0) {
    lines.push(`  * Injuries & Physical Limitations (MUST RESPECT): ${byCat.injury_limitation.join(' | ')}`);
  }
  lines.push(
    '  * MEMORY DIRECTIVE: Actively tailor your food suggestions, exercise prescriptions, and coaching tone to these personal memories without waiting to be reminded.'
  );

  return lines.join('\n');
}

/**
 * Formats stored memories into a tight, token-efficient line for on-device GGUF models.
 */
export function formatMemoriesForCompactPrompt(
  memories: MemoryItem[],
  query?: string,
  isThai: boolean = false
): string {
  const selected = retrieveRelevantMemories(memories, query, 5);
  if (selected.length === 0) return '';

  const compactFacts = selected.map((m) => m.content).join('; ');
  return isThai
    ? `\n- ความจำเกี่ยวกับนักกีฬา (ชอบ/ข้อจำกัด): ${compactFacts}`
    : `\n- Athlete Memory (Preferences/Traits): ${compactFacts}`;
}

