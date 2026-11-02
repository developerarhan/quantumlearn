export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-semibold text-slate-700">QuantumLearn</span> — a teaching lab for quantum
          computing fundamentals.
        </p>
        <p>
          Simulations run on <span className="font-medium text-slate-700">Qiskit Aer</span>. User Python is parsed,
          never executed.
        </p>
      </div>
    </footer>
  );
}
