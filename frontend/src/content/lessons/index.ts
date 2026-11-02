import basicAlgorithms from './basic-algorithms.json';
import bitsVsQubits from './bits-vs-qubits.json';
import entanglement from './entanglement.json';
import measurement from './measurement.json';
import quantumGates from './quantum-gates.json';
import superposition from './superposition.json';
import type { Lesson } from './types';

const rawLessons = [
  bitsVsQubits,
  superposition,
  quantumGates,
  measurement,
  entanglement,
  basicAlgorithms,
] as unknown as Lesson[];

export const lessons: Lesson[] = [...rawLessons].sort((a, b) => a.id.localeCompare(b.id));

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

export function getNextLesson(slug: string): Lesson | undefined {
  const index = lessons.findIndex((lesson) => lesson.slug === slug);
  if (index < 0 || index >= lessons.length - 1) return undefined;
  return lessons[index + 1];
}

export function getPreviousLesson(slug: string): Lesson | undefined {
  const index = lessons.findIndex((lesson) => lesson.slug === slug);
  if (index <= 0) return undefined;
  return lessons[index - 1];
}

export type { Lesson, LessonSection, CheckQuestion } from './types';
