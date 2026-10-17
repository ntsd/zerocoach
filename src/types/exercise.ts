export interface RepDBExercise {
  id: string;
  name_en: string;
  name_de?: string;
  name_es?: string;
  description_en: string;
  category: string;
  force_type?: string;
  mechanic?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string;
  body_part: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  goals: string[];
  tags: string[];
  is_unilateral: boolean;
  is_bodyweight: boolean;
  instructions_en: string[];
  tips_en: string[];
  met: number;
  images?: {
    flat?: {
      start?: string;
      peak?: string;
      main?: string;
    };
  };
}

export interface RepDBDataset {
  name: string;
  homepage: string;
  license: string;
  schema_version: number;
  count: number;
  note: string;
  exercises: RepDBExercise[];
}
