import { describe, expect, it } from 'vitest';
import { getLesson, getNextLesson, lessons } from '../content/lessons';
import { validateCircuitClient } from '../utils/circuit';

describe('lesson content', () => {
  it('contains six uniquely identified lessons in order', () => {
    expect(lessons).toHaveLength(6);
    expect(lessons.map((lesson) => lesson.id)).toEqual(['L01', 'L02', 'L03', 'L04', 'L05', 'L06']);
    expect(new Set(lessons.map((lesson) => lesson.slug)).size).toBe(6);
  });

  it.each(lessons.map((lesson) => [lesson.slug, lesson] as const))(
    'lesson %s is complete and its example circuit is valid',
    (_slug, lesson) => {
      expect(lesson.title.length).toBeGreaterThan(5);
      expect(lesson.summary.length).toBeGreaterThan(20);
      expect(lesson.objectives.length).toBeGreaterThan(0);
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.expected_behavior.length).toBeGreaterThan(0);
      expect(lesson.check_questions.length).toBeGreaterThan(0);
      expect(validateCircuitClient(lesson.example_circuit)).toBeNull();
      expect(validateCircuitClient(lesson.example_circuit, { requireMeasurement: true })).toBeNull();

      for (const question of lesson.check_questions) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.answer_index).toBeGreaterThanOrEqual(0);
        expect(question.answer_index).toBeLessThan(question.options.length);
        expect(question.explanation.length).toBeGreaterThan(10);
      }
    },
  );

  it('uses the required superposition circuit', () => {
    expect(getLesson('superposition')?.example_circuit).toEqual({
      num_qubits: 1,
      gates: [
        { name: 'h', target: 0 },
        { name: 'measure', target: 0, classical_bit: 0 },
      ],
      shots: 1024,
    });
  });

  it('uses the required Bell-state circuit', () => {
    expect(getLesson('entanglement')?.example_circuit.gates).toEqual([
      { name: 'h', target: 0 },
      { name: 'cx', control: 0, target: 1 },
      { name: 'measure', target: 0, classical_bit: 0 },
      { name: 'measure', target: 1, classical_bit: 1 },
    ]);
  });

  it('uses the exact one-bit Bernstein-Vazirani circuit with s = 1', () => {
    expect(getLesson('basic-algorithms')?.example_circuit).toEqual({
      num_qubits: 2,
      gates: [
        { name: 'x', target: 1 },
        { name: 'h', target: 0 },
        { name: 'h', target: 1 },
        { name: 'cx', control: 0, target: 1 },
        { name: 'h', target: 0 },
        { name: 'measure', target: 0, classical_bit: 0 },
      ],
      shots: 1024,
    });
  });

  it('links lessons into a sequence', () => {
    expect(getNextLesson('bits-vs-qubits')?.slug).toBe('superposition');
    expect(getNextLesson('basic-algorithms')).toBeUndefined();
  });
});
