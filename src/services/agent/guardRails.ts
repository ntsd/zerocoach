import { DomainName } from './types';

export const MUTATION_DOMAINS: readonly DomainName[] = [
  'food_history',
  'workout_plan',
  'workout_history',
  'settings',
];

export const SAFE_READ_DOMAINS: readonly DomainName[] = [
  'memory',
  'food_database',
  'workout_database',
  'telemetry',
];

export const MUTATION_TOOLS = [
  'log_food_item',
  'delete_food_entry',
  'update_workout_plan',
  'swap_plan_exercise',
  'manage_workout_schedule',
  'log_completed_workout',
  'update_user_settings',
  'update_daily_macro_targets',
] as const;

export type MutationToolName = (typeof MUTATION_TOOLS)[number];

const ADVISORY_QUERY_REGEX =
  /\b(suggest|recommend|recommendation|recommendations|what should i|what can i|what could i|what to eat|what workout|how should i|ideas|options|recipe|recipes|give me a workout|give me food|any ideas|what do you think|which exercise|which workout|what meal|which meal|advice|plan for me|meal ideas?|workout ideas?)\b/i;

const THAI_ADVISORY_REGEX =
  /(?:แนะนำ|ควร|ทานอะไร|กินอะไรดี|กินไรดี|เล่นอะไรดี|เล่นไรดี|ซ้อมอะไรดี|มีอะไรบ้าง|ขอเมนู|ขอตาราง|เมนูไหนดี|ท่าไหนดี|โปรแกรมอะไรดี|ทานอะไรดี)/;

const EXPLICIT_LOG_ACTION_REGEX =
  /\b(log\s+(this|it|\d+|food|workout|meal|my|breakfast|lunch|dinner|snack|exercise)|record\s+(this|it|\d+|food|workout)|บันทึก(เลย|อันนี้|นี้|อาหาร|การซ้อม)|ลบ(เลย|อันนี้|นี้|อาหาร))\b/i;

/**
 * Checks whether a user message is an advisory or recommendation inquiry.
 * Advisory queries ask for recommendations or advice and must not trigger state mutations.
 */
export function isAdvisoryQuery(userMsg: string): boolean {
  if (!userMsg) return false;
  const msgLower = userMsg.toLowerCase().trim();

  // If there's an explicit log/record command (e.g. "log this", "log 200g chicken"), it is not pure advisory
  if (EXPLICIT_LOG_ACTION_REGEX.test(msgLower)) {
    return false;
  }

  return ADVISORY_QUERY_REGEX.test(msgLower) || THAI_ADVISORY_REGEX.test(userMsg);
}

/**
 * Checks whether an emitted ToolCall is an accidental mutation on an advisory query.
 */
export function isAccidentalMutationOnAdvisoryQuery(
  toolName: string,
  userMsg: string,
  toolArgs?: Record<string, any>
): boolean {
  if (!userMsg) return false;
  if (!MUTATION_TOOLS.includes(toolName as MutationToolName)) return false;

  return isAdvisoryQuery(userMsg);
}

/**
 * Accidental target update protection: If the athlete is asking what to eat or for food recommendations,
 * but did not explicitly ask to change their macro targets, block the tool call and synthesize food options.
 */
export function isTargetUpdateAccidentalOnMealInquiry(
  toolName: string,
  userMsg: string,
  toolArgs?: Record<string, any>
): boolean {
  if (!userMsg) return false;
  if (toolName !== 'update_daily_macro_targets' && toolName !== 'update_user_settings') return false;
  if (toolName === 'update_user_settings' && !toolArgs?.dailyCalorieTarget && !toolArgs?.proteinGrams) {
    return false;
  }
  const userMsgLower = userMsg.toLowerCase();
  const isExplicitTargetUpdateRequest =
    /\b(update|change|set|adjust|modify|reset)\b.*\b(target|goal|calorie|protein|macro)\b/i.test(
      userMsgLower
    ) || /เปลี่ยน|ตั้งค่า|ปรับ.*(เป้าหมาย|แคล|โปรตีน)/.test(userMsgLower);

  const isMealInquiry =
    /\b(what|suggest|recommend|eat|meal|food|portion|recipe)\b/i.test(userMsgLower) ||
    /แนะนำ|ทานอะไร|กินอะไรดี|ควรทาน|เมนู/.test(userMsgLower);

  return !isExplicitTargetUpdateRequest && isMealInquiry;
}

