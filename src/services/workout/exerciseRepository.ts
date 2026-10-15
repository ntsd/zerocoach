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
    const q = query.toLowerCase().trim();
    if (!q) return this.exercises;

    return this.exercises.filter((e) => {
      const nameMatch = e.name_en.toLowerCase().includes(q);
      const muscleMatch = e.primary_muscles.some((m) => m.toLowerCase().includes(q));
      const equipMatch = e.equipment?.toLowerCase().includes(q);
      const tagMatch = e.tags?.some((t) => t.toLowerCase().includes(q));
      return nameMatch || muscleMatch || equipMatch || tagMatch;
    });
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
