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

export function normalizeMemoryCategory(raw?: string): MemoryCategory {
  if (!raw) return 'personality_style';
  const lower = raw.toLowerCase().trim();
  if (
    lower.includes('food') ||
    lower.includes('diet') ||
    lower.includes('nutrition') ||
    lower.includes('meal') ||
    lower.includes('eat') ||
    lower.includes('allerg')
  ) {
    return 'food_preference';
  }
  if (
    lower.includes('workout') ||
    lower.includes('skill') ||
    lower.includes('exercise') ||
    lower.includes('train') ||
    lower.includes('calisthenics') ||
    lower.includes('gym') ||
    lower.includes('movement')
  ) {
    return 'workout_preference';
  }
  if (
    lower.includes('injur') ||
    lower.includes('limit') ||
    lower.includes('pain') ||
    lower.includes('hurt') ||
    lower.includes('joint') ||
    lower.includes('medical') ||
    lower.includes('recover')
  ) {
    return 'injury_limitation';
  }
  return 'personality_style';
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
 * Fast, zero-latency bilingual (EN/TH) fact extractor so even compact on-device models
 * automatically capture explicit athlete preferences, favorite foods, favorite skills, and injuries.
 */
export function extractMemoriesFromMessage(userMessage: string): MemoryCandidate[] {
  if (!userMessage || userMessage.trim().length < 4) return [];
  const text = userMessage.trim();
  const candidates: MemoryCandidate[] = [];

  // Split into clauses by sentence boundaries
  const clauses = text
    .split(/(?:[.!?\n]+|\b(?:and also|also)\b)/i)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    if (clause.endsWith('?') || /^(what|how|why|when|can you|could you|should i|do you)\b/i.test(clause)) {
      continue;
    }

    // -------------------------------------------------------------------------
    // 1. FOOD PREFERENCES & DIETARY RESTRICTIONS (EN + TH)
    // -------------------------------------------------------------------------
    const favFoodMatch =
      clause.match(
        /\bmy\s+fav(?:ou?rite)?\s+(?:food|meal|dish|snack|protein|breakfast|lunch|dinner)s?\s+(?:is|are)\s+([^,.!]+)/i
      ) ||
      clause.match(
        /\bi\s+(?:really\s+)?(?:love|like|enjoy)\s+(?:eating|having|to eat)\s+([^,.!]+)/i
      ) ||
      clause.match(/(?:อาหารที่ชอบ|ของโปรด|เมนูโปรด|ชอบกิน|ชอบทาน)\s*(?:คือ|ได้แก่)?\s*([^,.!\n]+)/);

    if (favFoodMatch && favFoodMatch[1]) {
      const item = favFoodMatch[1].trim();
      if (item.length >= 2 && item.length <= 80) {
        candidates.push({
          category: 'food_preference',
          topic: 'favorite_food',
          content: `Favorite food: ${item}`,
          source: 'extractor',
        });
        continue;
      }
    }

    const dislikeFoodMatch =
      clause.match(/\bi\s+(?:hate|dislike|don't eat|do not eat|never eat|avoid eating)\s+([^,.!]+)/i) ||
      clause.match(/(?:ไม่ชอบกิน|ไม่กิน|เกลียดอาหาร|ห้ามกิน)\s*([^,.!\n]+)/);

    if (dislikeFoodMatch && dislikeFoodMatch[1]) {
      const item = dislikeFoodMatch[1].trim();
      if (item.length >= 2 && item.length <= 80) {
        candidates.push({
          category: 'food_preference',
          content: `Dislikes / avoids eating: ${item}`,
          source: 'extractor',
        });
        continue;
      }
    }

    const allergyMatch =
      clause.match(/\bi(?:'m|\s+am)\s+(?:allergic\s+to|intolerant\s+to)\s+([^,.!]+)/i) ||
      clause.match(/\bi\s+have\s+(?:a\s+)?([a-z\s]+?\s+(?:allergy|intolerance))\b/i) ||
      clause.match(/\bi(?:'m|\s+am)\s+(lactose intolerant|vegan|vegetarian|pescatarian|keto|halal|gluten[- ]free)\b/i) ||
      clause.match(/(?:แพ้อาหาร|แพ้)\s*([^,.!\n]+)/);

    if (allergyMatch && allergyMatch[1]) {
      const item = allergyMatch[1].trim();
      if (item.length >= 2 && item.length <= 80) {
        candidates.push({
          category: 'food_preference',
          topic: 'food_allergy',
          content: `Dietary restriction / allergy: ${item}`,
          source: 'extractor',
        });
        continue;
      }
    }

    // -------------------------------------------------------------------------
    // 2. WORKOUT & SKILL PREFERENCES (EN + TH)
    // -------------------------------------------------------------------------
    const favSkillMatch =
      clause.match(
        /\bmy\s+fav(?:ou?rite)?\s+(?:workout\s+skill|calisthenics\s+skill|skill|exercise|workout|movement|lift)s?\s+(?:is|are)\s+([^,.!]+)/i
      ) ||
      clause.match(
        /\bi\s+(?:really\s+)?(?:love|enjoy)\s+(?:doing|training|practicing)\s+([^,.!]+)/i
      ) ||
      clause.match(
        /\bmy\s+(?:dream|goal|target)\s+(?:skill|move|exercise)\s+is\s+([^,.!]+)/i
      ) ||
      clause.match(/(?:ท่าที่ชอบ|สกิลที่ชอบ|ชอบฝึกท่า|ชอบเล่นท่า|ท่าโปรด)\s*(?:คือ)?\s*([^,.!\n]+)/);

    if (favSkillMatch && favSkillMatch[1]) {
      const skill = favSkillMatch[1].trim();
      if (skill.length >= 2 && skill.length <= 80) {
        const isSkill = /skill|lever|planche|muscle[- ]?up|handstand|l-sit|human flag|สกิล/i.test(clause);
        candidates.push({
          category: 'workout_preference',
          topic: isSkill ? 'favorite_skill' : 'favorite_exercise',
          content: isSkill ? `Favorite workout skill: ${skill}` : `Favorite exercise/workout: ${skill}`,
          source: 'extractor',
        });
        continue;
      }
    }

    const dislikeWorkoutMatch =
      clause.match(
        /\bi\s+(?:hate|dislike|avoid)\s+(?:doing\s+)?(burpees|running|cardio|leg day|squats|deadlifts|lunges|pull-?ups|push-?ups|planks|[a-z\s-]{3,30}\s+exercises?)\b/i
      ) || clause.match(/(?:เกลียดท่า|ไม่ชอบเล่นท่า|ไม่ชอบฝึก)\s*([^,.!\n]+)/);

    if (dislikeWorkoutMatch && dislikeWorkoutMatch[1]) {
      const ex = dislikeWorkoutMatch[1].trim();
      if (ex.length >= 2 && ex.length <= 80) {
        candidates.push({
          category: 'workout_preference',
          content: `Dislikes exercise: ${ex}`,
          source: 'extractor',
        });
        continue;
      }
    }

    // -------------------------------------------------------------------------
    // 3. INJURIES & PHYSICAL LIMITATIONS (EN + TH)
    // -------------------------------------------------------------------------
    const injuryRecoveryMatch =
      clause.match(
        /\bmy\s+(shoulder|knee|wrist|back|lower back|elbow|ankle|neck|hip)\s+(?:no longer hurts|is healed|recovered|pain is gone)\b/i
      ) || clause.match(/หาย(?:เจ็บ|ปวด)(ไหล่|เข่า|ข้อมือ|หลัง|ข้อศอก|ข้อเท้า|คอ|สะโพก)แล้ว/);

    if (injuryRecoveryMatch && injuryRecoveryMatch[1]) {
      candidates.push({
        category: 'injury_limitation',
        content: clause,
        operationHint: 'DELETE',
        source: 'extractor',
      });
      continue;
    }

    const injuryMatch =
      clause.match(
        /\bi\s+have\s+(?:a\s+|an\s+)?((?:left\s+|right\s+)?(?:shoulder|knee|wrist|lower back|back|elbow|ankle|neck|hip|rotator cuff|meniscus|acl|joint)[^,.!]{0,45}(?:injury|pain|impingement|issue|strain|sprain|tendonitis|problem)?)/i
      ) ||
      clause.match(
        /\bmy\s+((?:left\s+|right\s+)?(?:shoulder|knee|wrist|lower back|back|elbow|ankle|neck|hip)s?\s+(?:hurts?|is\s+injured|is\s+sore|has\s+pain|is\s+recovering[^,.!]*))/i
      ) ||
      clause.match(/(?:เจ็บ|ปวด|บาดเจ็บที่)\s*(ไหล่|หัวเข่า|เข่า|ข้อมือ|หลัง|หลังส่วนล่าง|ข้อศอก|ข้อเท้า|คอ|สะโพก)([^,.!\n]{0,30})/);

    if (injuryMatch && injuryMatch[1]) {
      const detail = injuryMatch[2] ? `${injuryMatch[1]}${injuryMatch[2]}` : injuryMatch[1];
      candidates.push({
        category: 'injury_limitation',
        content: `Physical limitation / injury: ${detail.trim()}`,
        source: 'extractor',
      });
      continue;
    }

    // -------------------------------------------------------------------------
    // 4. PERSONALITY, SCHEDULE & COACHING PREFERENCES (EN + TH)
    // -------------------------------------------------------------------------
    const personalityMatch =
      clause.match(
        /\bi\s+prefer\s+((?:morning|evening|night|short|quick|intense|strict|flexible|outdoor|home|gym)\s+(?:workouts?|training|sessions?|coaching)[^,.!]{0,30})/i
      ) ||
      clause.match(
        /\bmy\s+personality\s+is\s+([^,.!]+)/i
      ) ||
      clause.match(
        /\bplease\s+(?:be\s+more|talk\s+to\s+me)\s+(strict|direct|encouraging|supportive|concise|brief|humorous|motivating)\b/i
      ) ||
      clause.match(/(?:ชอบซ้อมตอน|ชอบออกกำลังกายตอน|นิสัยของฉันคือ|อยากให้โค้ชพูดแบบ)\s*([^,.!\n]+)/);

    if (personalityMatch && personalityMatch[1]) {
      const trait = personalityMatch[1].trim();
      if (trait.length >= 2 && trait.length <= 80) {
        candidates.push({
          category: 'personality_style',
          content: `Athlete preference / personality: ${trait}`,
          source: 'extractor',
        });
      }
    }
  }

  return candidates;
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

