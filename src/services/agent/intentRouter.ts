import { DomainName } from './types';

export const ALL_DOMAINS: DomainName[] = [
  'telemetry',
  'food_history',
  'food_database',
  'workout_history',
  'workout_plan',
  'workout_database',
  'settings',
  'memory',
];

interface DomainPattern {
  domain: DomainName;
  keywords: string[];
  regex?: RegExp;
}

const DOMAIN_PATTERNS: DomainPattern[] = [
  {
    domain: 'food_history',
    keywords: [
      'calorie',
      'protein',
      'carb',
      'fat',
      'fiber',
      'sugar',
      'food',
      'meal',
      'lunch',
      'breakfast',
      'dinner',
      'snack',
      'ate',
      'eaten',
      'log food',
      'logged food',
      'delete food',
      'macro',
      'nutrition diary',
      'chicken',
      'rice',
      'steak',
      'egg',
      'beef',
      'salad',
      // Thai keywords
      'กิน',
      'มื้อ',
      'อาหาร',
      'ข้าว',
      'โปรตีน',
      'แคล',
      'แคลอรี่',
      'บันทึกอาหาร',
    ],
    regex: /\b(log|delete|record|ate|eat|eaten)\b.*\b(breakfast|lunch|dinner|snack|meal|grams?|kcal|calories)\b/i,
  },
  {
    domain: 'food_database',
    keywords: [
      'search food',
      'food database',
      'nutrition lookup',
      'nutrition of',
      'calories in',
      'how much protein in',
      'usda',
      'openfoodfacts',
      // Thai keywords
      'หาอาหาร',
      'ค้นหาอาหาร',
      'สารอาหาร',
      'กี่แคล',
    ],
    regex: /\b(calories|protein|nutrition)\s+in\b/i,
  },
  {
    domain: 'workout_plan',
    keywords: [
      'workout plan',
      'training plan',
      'routine',
      'exercise',
      'sets',
      'reps',
      'swap',
      'replace exercise',
      'schedule',
      'rest day',
      'split',
      'push pull legs',
      'upper lower',
      'full body',
      'skip workout',
      'reschedule',
      'squat',
      'bench press',
      'deadlift',
      'pull up',
      'push up',
      'dumbbell',
      'barbell',
      // Thai keywords
      'โปรแกรม',
      'ตารางซ้อม',
      'ตารางออกกำลังกาย',
      'เปลี่ยนท่า',
      'สลับท่า',
      'วันพัก',
      'เลื่อนซ้อม',
    ],
    regex: /\b(swap|replace|change|reschedule|skip)\b.*\b(exercise|workout|routine|plan)\b/i,
  },
  {
    domain: 'workout_history',
    keywords: [
      'completed workout',
      'finished workout',
      'logged workout',
      'finished set',
      'completed set',
      'workout log',
      'rpe',
      'duration',
      'lifted',
      // Thai keywords
      'ซ้อมเสร็จ',
      'ออกกำลังกายเสร็จ',
      'ยกได้',
      'บันทึกการซ้อม',
    ],
    regex: /\b(completed|finished|logged)\b.*\b(workout|training|session|set)\b/i,
  },
  {
    domain: 'workout_database',
    keywords: [
      'search exercise',
      'exercise details',
      'how to perform',
      'form cue',
      'exercise technique',
      'biomechanics',
      'repdb',
      'exercise database',
      // Thai keywords
      'ค้นหาท่า',
      'วิธีเล่น',
      'วิธีฝึก',
      'เทคนิคท่า',
    ],
    regex: /\b(how\s+to\s+(perform|do)|technique\s+for)\b/i,
  },
  {
    domain: 'telemetry',
    keywords: [
      'readiness',
      'hrv',
      'heart rate',
      'sleep',
      'recovery',
      'fatigue',
      'soreness',
      'daily steps',
      'active calories',
      'wearable',
      'health connect',
      'healthkit',
      // Thai keywords
      'ความพร้อม',
      'การนอน',
      'ฟื้นฟู',
      'เมื่อย',
      'ชีพจร',
      'ก้าวเดิน',
    ],
    regex: /\b(readiness\s+score|hrv|sleep\s+quality|resting\s+heart\s+rate)\b/i,
  },
  {
    domain: 'settings',
    keywords: [
      'weight',
      'height',
      'target calories',
      'macro targets',
      'profile settings',
      'calorie goal',
      'protein goal',
      'user settings',
      // Thai keywords
      'น้ำหนัก',
      'ส่วนสูง',
      'เป้าหมายแคล',
      'เป้าหมายโปรตีน',
      'ตั้งค่า',
    ],
    regex: /\b(update|change|set)\b.*\b(weight|target|goal|profile|settings)\b/i,
  },
  {
    domain: 'memory',
    keywords: [
      'remember',
      'forget',
      'memory',
      'prefer',
      'preference',
      'allergic',
      'allergy',
      'favorite',
      'dislike',
      'hate',
      'love',
      'like',
      'injury',
      'injured',
      'hurt',
      'pain',
      'equipment',
      'pull-up bar',
      'pull up bar',
      'dumbbell',
      'barbell',
      'bought',
      'own',
      // Thai keywords
      'จำ',
      'ลืม',
      'ลบความจำ',
      'ชอบ',
      'ไม่ชอบ',
      'แพ้',
      'เจ็บ',
      'ปวด',
      'อุปกรณ์',
      'บาร์โหน',
      'ดัมเบล',
      'ซื้อ',
    ],
    regex: /\b(remember|forget|remove|delete|save)\b.*\b(memory|preference|fact|allergy|injury|food|diet|trait)\b/i,
  },
];

const ANAPHORA_ACTION_PATTERN =
  /\b(log\s+(it|this|that|them|the\s+second|the\s+first|the\s+last)|swap\s+(it|this|that)|delete\s+(it|this|that)|remove\s+(it|this|that)|yes\s+(please|log|swap)|confirm|do\s+it)\b|บันทึก(เลย|อันนี้|นี้)|เปลี่ยน(เลย|อันนี้|นี้)|ลบ(เลย|อันนี้|นี้)/i;

/**
 * Sub-millisecond, low-allocation heuristic intent classifier.
 * Evaluates the user query, applies multi-turn anaphora inheritance,
 * preserves ambient memory unconditionally, and falls back to full catalog on ambiguity.
 */
export function classifyUserIntent(
  query: string,
  history?: Array<{ role: string; content: string }>
): DomainName[] {
  const normalizedQuery = (query || '').toLowerCase().trim();
  if (!normalizedQuery) {
    return [...ALL_DOMAINS];
  }

  const matchedDomains = new Set<DomainName>();

  for (const { domain, keywords, regex } of DOMAIN_PATTERNS) {
    if (regex && regex.test(normalizedQuery)) {
      matchedDomains.add(domain);
      continue;
    }
    for (const keyword of keywords) {
      if (normalizedQuery.includes(keyword)) {
        matchedDomains.add(domain);
        break;
      }
    }
  }

  // Multi-Turn Context Inheritance:
  // If no domain keywords match directly, but the query contains anaphoric action cues
  // (e.g., "Log it", "Swap that", "Yes please"), inspect recent history turns.
  if (matchedDomains.size === 0 && history && history.length > 0) {
    if (ANAPHORA_ACTION_PATTERN.test(normalizedQuery)) {
      for (let i = history.length - 1; i >= 0; i--) {
        const prevMsg = history[i];
        if (!prevMsg?.content) continue;
        const prevNormalized = prevMsg.content.toLowerCase();

        for (const { domain, keywords, regex } of DOMAIN_PATTERNS) {
          if (regex && regex.test(prevNormalized)) {
            matchedDomains.add(domain);
          } else {
            for (const kw of keywords) {
              if (prevNormalized.includes(kw)) {
                matchedDomains.add(domain);
                break;
              }
            }
          }
        }

        if (matchedDomains.size > 0) {
          break;
        }
      }
    }
  }

  // Safe Full-Catalog Fallback:
  // If zero domains matched (casual chat, greeting, or unrecognized query),
  // fall back to the complete catalog so tools are never starved.
  if (matchedDomains.size === 0) {
    return [...ALL_DOMAINS];
  }

  // Ambient Memory Invariant: memory is unconditionally declared
  matchedDomains.add('memory');

  return Array.from(matchedDomains);
}

