import { RepDBDataset, RepDBExercise } from '@/types/exercise';
import exercisesData from '@/data/exercises.json';

const dataset = exercisesData as RepDBDataset;
const allExercises: RepDBExercise[] = dataset.exercises || [];

export interface ExerciseFilterParams {
  goals?: string[];
  isBodyweight?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  bodyPart?: string;
  category?: string;
  forceType?: string;
  mechanic?: string;
  equipment?: string;
  searchQuery?: string;
}

export class ExerciseRepository {
  private static instance: ExerciseRepository;
  private exercises: RepDBExercise[];

  private constructor() {
    this.exercises = allExercises;
  }

  public static getInstance(): ExerciseRepository {
    if (!ExerciseRepository.instance) {
      ExerciseRepository.instance = new ExerciseRepository();
    }
    return ExerciseRepository.instance;
  }

  public getAll(): RepDBExercise[] {
    return this.exercises;
  }

  public getCount(): number {
    return this.exercises.length;
  }

  public getById(id: string): RepDBExercise | undefined {
    return this.exercises.find((e) => e.id === id);
  }

  public search(query: string): RepDBExercise[] {
    const rawQ = query.toLowerCase().trim();
    if (!rawQ) return this.exercises;
    const normQ = rawQ.replace(/[\s\-_]+/g, '');

    const scored: { exercise: RepDBExercise; score: number }[] = [];

    for (const e of this.exercises) {
      const nameEn = e.name_en.toLowerCase();
      const normName = nameEn.replace(/[\s\-_]+/g, '');
      const normId = e.id.toLowerCase().replace(/[\s\-_]+/g, '');

      let score = 0;
      if (normId === normQ || normName === normQ) {
        score = 100;
      } else if (nameEn === rawQ || e.id === rawQ) {
        score = 95;
      } else if (normName.startsWith(normQ) || normId.startsWith(normQ)) {
        score = 80;
      } else if (nameEn.includes(rawQ) || e.id.includes(rawQ)) {
        score = 60;
      } else if (e.primary_muscles.some((m) => m.toLowerCase().includes(rawQ))) {
        score = 30;
      } else if (e.equipment?.toLowerCase().includes(rawQ)) {
        score = 20;
      } else if (e.tags?.some((t) => t.toLowerCase().includes(rawQ))) {
        score = 10;
      }

      if (score > 0) {
        const lengthPenalty = Math.min(10, Math.abs(nameEn.length - rawQ.length) * 0.2);
        scored.push({ exercise: e, score: score - lengthPenalty });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.exercise);
  }

  public filter(params: ExerciseFilterParams): RepDBExercise[] {
    return this.exercises.filter((e) => {
      if (params.isBodyweight !== undefined && e.is_bodyweight !== params.isBodyweight) {
        return false;
      }

      if (params.difficulty && e.difficulty !== params.difficulty) {
        return false;
      }

      if (params.bodyPart && e.body_part !== params.bodyPart) {
        return false;
      }

      if (params.category && e.category !== params.category) {
        return false;
      }

      if (params.forceType && e.force_type !== params.forceType) {
        return false;
      }

      if (params.mechanic && e.mechanic !== params.mechanic) {
        return false;
      }

      if (params.equipment && e.equipment !== params.equipment) {
        return false;
      }

      if (params.goals && params.goals.length > 0) {
        const hasGoal = e.goals?.some((g) => params.goals!.includes(g));
        if (!hasGoal) return false;
      }

      if (params.searchQuery) {
        const q = params.searchQuery.toLowerCase().trim();
        const matchesName = e.name_en.toLowerCase().includes(q);
        const matchesMuscle = e.primary_muscles.some((m) => m.toLowerCase().includes(q));
        if (!matchesName && !matchesMuscle) return false;
      }

      return true;
    });
  }

  public getSample(params: ExerciseFilterParams, limit: number = 4): RepDBExercise[] {
    const matched = this.filter(params);
    if (matched.length <= limit) return matched;
    // Return deterministic sample based on name sorting to avoid flickering renders
    return matched.slice(0, limit);
  }
}

export const exerciseRepository = ExerciseRepository.getInstance();
