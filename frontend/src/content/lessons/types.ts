import type { Circuit } from '../../models/circuit';

export interface LessonCallout {
  title: string;
  text: string;
  tone?: 'info' | 'key' | 'warning';
}

export interface LessonSection {
  heading: string;
  body: string[];
  equation?: string;
  callout?: LessonCallout;
}

export interface CheckQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  summary: string;
  duration_minutes: number;
  level: 'Beginner' | 'Intermediate';
  objectives: string[];
  prerequisites: string[];
  sections: LessonSection[];
  example_circuit: Circuit;
  expected_behavior: string[];
  check_questions: CheckQuestion[];
}
