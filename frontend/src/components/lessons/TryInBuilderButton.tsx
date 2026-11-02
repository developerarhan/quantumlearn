import { FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Circuit } from '../../models/circuit';
import { useCircuit } from '../../state/circuit';

interface TryInBuilderButtonProps {
  circuit: Circuit;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function TryInBuilderButton({
  circuit,
  label = 'Try in Builder',
  className,
  compact = false,
}: TryInBuilderButtonProps) {
  const { state, dispatch } = useCircuit();
  const navigate = useNavigate();

  function loadCircuit() {
    const hasExistingCircuit = state.circuit.gates.length > 0;
    if (hasExistingCircuit) {
      const confirmed = window.confirm(
        'This will replace the circuit currently in the Playground. Continue?',
      );
      if (!confirmed) return;
    }
    dispatch({ type: 'REPLACE_CIRCUIT', circuit });
    navigate('/playground');
  }

  return (
    <button
      type="button"
      onClick={loadCircuit}
      className={className ?? (compact ? 'btn-secondary px-3 py-1.5 text-xs' : 'btn-primary')}
    >
      <FlaskConical size={compact ? 13 : 16} aria-hidden="true" />
      {label}
    </button>
  );
}
