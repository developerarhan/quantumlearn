import { expect, test, type Page } from '@playwright/test';

async function dragGate(page: Page, paletteName: RegExp, cellName: string): Promise<void> {
  const source = page.getByRole('button', { name: paletteName });
  const target = page.getByRole('button', { name: cellName });
  await source.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Gate or cell is not visible');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 12, sourceBox.y + sourceBox.height / 2 + 12, {
    steps: 4,
  });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 12,
  });
  await page.waitForTimeout(250);
  await page.mouse.up();
}

test.describe('QuantumLearn end-to-end journeys', () => {
  test('learns a lesson, loads it into the builder, runs Aer, and rejects unsafe Python', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Build a circuit');

    await page.getByRole('link', { name: 'Learn', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Six lessons, one quantum circuit at a time' }),
    ).toBeVisible();
    await expect(page.locator('article')).toHaveCount(6);

    await page.getByRole('link', { name: 'Superposition and Amplitudes' }).click();
    await expect(page.getByRole('heading', { name: 'Superposition and Amplitudes' })).toBeVisible();

    await page.getByRole('button', { name: /Try in Builder/ }).first().click();
    await expect(page).toHaveURL(/\/playground$/);
    await expect(page.getByRole('heading', { name: 'Quantum circuit playground' })).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Circuit diagram with 1 qubits and 2 steps' }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Run circuit/ }).click();
    await expect(page.getByText('Live Aer output')).toBeVisible();

    const resultRows = page.locator('table tbody th[scope="row"]');
    await expect(resultRows).toHaveCount(2);
    await expect(resultRows.filter({ hasText: /^0$/ })).toHaveCount(1);
    await expect(resultRows.filter({ hasText: /^1$/ })).toHaveCount(1);
    await expect(page.locator('table tfoot')).toContainText('1024');
    await expect(page.getByRole('heading', { name: 'H creates an equal-amplitude superposition' })).toBeVisible();

    await page.getByRole('tab', { name: /Python Code/ }).click();
    await expect(page.getByRole('heading', { name: 'Restricted Qiskit-style Python' })).toBeVisible();
    const editor = page.getByTestId('python-editor').locator('.cm-content');
    await expect(editor).toContainText('qc.h(0)');
    await expect(editor).toContainText('qc.measure(0, 0)');

    const xProgram = [
      'from qiskit import QuantumCircuit',
      '',
      'qc = QuantumCircuit(1, 1)',
      'qc.x(0)',
      'qc.measure(0, 0)',
    ].join('\n');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText(xProgram);
    await page.getByRole('button', { name: 'Apply to builder' }).click();
    await expect(page.getByText('Code applied to the builder')).toBeVisible();

    await page.getByRole('button', { name: 'Apply & run circuit' }).click();
    await expect(resultRows).toHaveCount(1);
    await expect(resultRows.first()).toHaveText('1');
    await expect(page.locator('table tfoot')).toContainText('1024');
    await expect(page.getByRole('heading', { name: 'X flips the computational state' })).toBeVisible();

    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('import os');
    await page.getByRole('button', { name: 'Apply to builder' }).click();
    await expect(page.getByText('Code could not be parsed')).toBeVisible();
    await expect(page.getByText(/CODE_INVALID_IMPORT/)).toBeVisible();
    await expect(editor).toContainText('import os');

    await page.getByRole('tab', { name: /Circuit Builder/ }).click();
    await expect(page.getByRole('group', { name: 'Circuit diagram with 1 qubits and 2 steps' })).toBeVisible();
    await expect(page.getByText('X gate on q0').first()).toBeVisible();
  });

  test('runs the Bell circuit and observes only correlated outcomes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Run the Bell circuit' }).click();
    await expect(page).toHaveURL(/\/playground$/);
    await expect(
      page.getByRole('group', { name: 'Circuit diagram with 2 qubits and 4 steps' }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Run circuit/ }).click();
    await expect(page.getByText('Live Aer output')).toBeVisible();

    const resultRows = page.locator('table tbody th[scope="row"]');
    await expect(resultRows).toHaveCount(2);
    await expect(resultRows.nth(0)).toHaveText('00');
    await expect(resultRows.nth(1)).toHaveText('11');
    await expect(
      page.getByRole('heading', { name: 'A Bell state produces correlated outcomes' }),
    ).toBeVisible();
  });

  test('supports drag-and-drop and keyboard gate placement', async ({ page }) => {
    await page.goto('/playground');
    await page.getByRole('button', { name: 'Add a qubit' }).click();

    await dragGate(page, /^X gate\./, 'Circuit cell, step 1, qubit 1');
    await expect(page.getByText('X gate on q1').first()).toBeVisible();

    await dragGate(page, /^H gate\./, 'Circuit cell, step 2, qubit 0');
    await expect(page.getByText('H gate on q0').first()).toBeVisible();

    await page.getByRole('button', { name: /^Z gate\./ }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Circuit cell, step 3, qubit 1' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Z gate on q1').first()).toBeVisible();
    await expect(page.getByRole('group', { name: 'Circuit diagram with 2 qubits and 3 steps' })).toBeVisible();
  });

  test('supports click-to-place and simulation on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/playground');

    await page.getByRole('button', { name: /^H gate\./ }).click();
    await page.getByRole('button', { name: 'Circuit cell, step 1, qubit 0' }).click();
    await page.getByRole('button', { name: /^Measure gate\./ }).click();
    await page.getByRole('button', { name: 'Circuit cell, step 2, qubit 0' }).click();
    await expect(page.getByText('H gate on q0').first()).toBeVisible();
    await expect(page.getByText('Measurement of q0 into classical bit 0').first()).toBeVisible();

    await page.getByRole('spinbutton', { name: 'Shots' }).fill('128');
    await page.getByRole('spinbutton', { name: 'Shots' }).press('Enter');
    await page.getByRole('button', { name: /Run circuit/ }).click();
    await expect(page.getByText('Live Aer output')).toBeVisible();
    await expect(page.locator('table tbody th[scope="row"]')).toHaveCount(2);
    await expect(page.locator('table tfoot')).toContainText('128');
  });

  test('opens every lesson and loads its example into the builder', async ({ page }) => {
    const lessons = [
      { slug: 'bits-vs-qubits', title: 'Classical Bits vs. Quantum Bits', qubits: 1, gates: 1 },
      { slug: 'superposition', title: 'Superposition and Amplitudes', qubits: 1, gates: 2 },
      { slug: 'quantum-gates', title: 'Quantum Gates: X, Y, Z, H, and CNOT', qubits: 1, gates: 3 },
      { slug: 'measurement', title: 'Quantum Measurement and Shots', qubits: 1, gates: 2 },
      { slug: 'entanglement', title: 'Entanglement and Bell States', qubits: 2, gates: 4 },
      { slug: 'basic-algorithms', title: /Bernstein/, qubits: 2, gates: 6 },
    ];

    for (const lesson of lessons) {
      await page.goto(`/learn/${lesson.slug}`);
      await expect(page.getByRole('heading', { level: 1, name: lesson.title })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Test your understanding' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Lesson circuit' })).toBeVisible();

      await page.getByRole('button', { name: /Try in Builder/ }).first().click();
      await expect(page).toHaveURL(/\/playground$/);
      await expect(
        page.getByRole('group', {
          name: `Circuit diagram with ${lesson.qubits} qubits and ${lesson.gates} steps`,
        }),
      ).toBeVisible();
    }
  });
});
