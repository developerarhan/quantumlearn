import { useDroppable } from '@dnd-kit/core';
import type { KeyboardEvent } from 'react';
import type { Circuit, Gate, GateName } from '../../models/circuit';
import { gateLabel } from '../../utils/circuit';

const ROW_HEIGHT = 64;
const TOP = 54;
const LEFT = 86;
const STEP_WIDTH = 88;
const RIGHT = 46;
const GATE_W = 50;
const GATE_H = 42;

const SINGLE_FILL: Record<'x' | 'y' | 'z' | 'h', string> = {
  x: 'fill-rose-500',
  y: 'fill-amber-500',
  z: 'fill-emerald-500',
  h: 'fill-indigo-500',
};

interface DropCellProps {
  step: number;
  qubit: number;
  x: number;
  y: number;
  width: number;
  height: number;
  onActivate: () => void;
}

function DropCell({ step, qubit, x, y, width, height, onActivate }: DropCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${step}:${qubit}` });
  return (
    <foreignObject x={x} y={y} width={width} height={height}>
      <button
        ref={setNodeRef}
        type="button"
        onClick={onActivate}
        aria-label={`Circuit cell, step ${step + 1}, qubit ${qubit}`}
        className={[
          'h-full w-full cursor-pointer rounded-lg border border-transparent p-0 transition-colors',
          isOver
            ? 'border-indigo-400 bg-indigo-100'
            : 'bg-transparent hover:border-indigo-200 hover:bg-indigo-50 focus-visible:border-indigo-400 focus-visible:bg-indigo-100',
        ].join(' ')}
      />
    </foreignObject>
  );
}

interface GateShapeProps {
  gate: Gate;
  index: number;
  x: number;
  selected: boolean;
  interactive: boolean;
  onSelect: (index: number) => void;
}

function GateShape({ gate, index, x, selected, interactive, onSelect }: GateShapeProps) {
  const activation = interactive
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': `Step ${index + 1}: ${gateLabel(gate)}. Select to move or delete.`,
        onClick: (event: React.MouseEvent) => {
          event.stopPropagation();
          onSelect(index);
        },
        onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(index);
          }
        },
      }
    : { 'aria-hidden': true as const };

  if (gate.name === 'cx') {
    const yControl = TOP + gate.control * ROW_HEIGHT;
    const yTarget = TOP + gate.target * ROW_HEIGHT;
    const minY = Math.min(yControl, yTarget);
    const maxY = Math.max(yControl, yTarget);
    return (
      <g {...activation} className={interactive ? 'cursor-pointer' : ''}>
        <rect
          x={x - 26}
          y={minY - 16}
          width={52}
          height={maxY - minY + 32}
          fill="transparent"
        />
        {selected ? (
          <rect
            x={x - 27}
            y={minY - 17}
            width={54}
            height={maxY - minY + 34}
            rx={10}
            className="fill-none stroke-indigo-500"
            strokeWidth={2.5}
          />
        ) : null}
        <line x1={x} y1={yControl} x2={x} y2={yTarget} className="stroke-slate-800" strokeWidth={2.5} />
        <circle cx={x} cy={yControl} r={6} className="fill-slate-900" />
        <circle cx={x} cy={yTarget} r={15} className="fill-white stroke-slate-900" strokeWidth={2.5} />
        <line x1={x - 15} y1={yTarget} x2={x + 15} y2={yTarget} className="stroke-slate-900" strokeWidth={2.5} />
        <line x1={x} y1={yTarget - 15} x2={x} y2={yTarget + 15} className="stroke-slate-900" strokeWidth={2.5} />
        <title>{gateLabel(gate)}</title>
      </g>
    );
  }

  const y = TOP + gate.target * ROW_HEIGHT;
  const isMeasure = gate.name === 'measure';
  return (
    <g {...activation} className={interactive ? 'cursor-pointer' : ''}>
      {selected ? (
        <rect
          x={x - GATE_W / 2 - 4}
          y={y - GATE_H / 2 - 4}
          width={GATE_W + 8}
          height={GATE_H + 8}
          rx={11}
          className="fill-none stroke-indigo-500"
          strokeWidth={2.5}
        />
      ) : null}
      <rect
        x={x - GATE_W / 2}
        y={y - GATE_H / 2}
        width={GATE_W}
        height={GATE_H}
        rx={8}
        className={isMeasure ? 'fill-slate-700' : SINGLE_FILL[gate.name]}
      />
      {isMeasure ? (
        <>
          <path
            d={`M ${x - 15} ${y + 9} A 15 15 0 0 1 ${x + 15} ${y + 9}`}
            className="fill-none stroke-white"
            strokeWidth={2}
          />
          <line x1={x} y1={y - 15} x2={x + 10} y2={y + 9} className="stroke-white" strokeWidth={2} />
          <text x={x} y={y + 6} textAnchor="middle" className="fill-white text-[11px] font-bold">
            M
          </text>
        </>
      ) : (
        <text x={x} y={y + 5} textAnchor="middle" className="fill-white text-[16px] font-bold">
          {gate.name.toUpperCase()}
        </text>
      )}
      <title>{gateLabel(gate)}</title>
    </g>
  );
}

export interface CircuitCanvasProps {
  circuit: Circuit;
  selectedGateIndex: number | null;
  pendingGate: GateName | null;
  pendingControl: number | null;
  pendingControlStep: number | null;
  onCellClick: (qubit: number, step: number) => void;
  onGateSelect: (index: number) => void;
}

export function CircuitCanvas({
  circuit,
  selectedGateIndex,
  pendingGate,
  pendingControl,
  pendingControlStep,
  onCellClick,
  onGateSelect,
}: CircuitCanvasProps) {
  const steps = circuit.gates.length;
  const width = Math.max(560, LEFT + (steps + 1) * STEP_WIDTH + RIGHT);
  const height = TOP + (circuit.num_qubits - 1) * ROW_HEIGHT + 48;
  const wireEnd = width - RIGHT + 16;
  const measured = new Set(
    circuit.gates.filter((gate) => gate.name === 'measure').map((gate) => gate.target),
  );

  return (
    <div className="overflow-x-auto scroll-thin rounded-xl border border-slate-200 bg-slate-50/60">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={`Circuit diagram with ${circuit.num_qubits} qubits and ${steps} steps`}
        className="block"
      >
        <defs>
          <pattern id="circuit-dots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="fill-slate-200" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#circuit-dots)" opacity={0.55} />

        {Array.from({ length: steps + 1 }, (_, step) => (
          <text
            key={`step-label-${step}`}
            x={LEFT + step * STEP_WIDTH + STEP_WIDTH / 2}
            y={22}
            textAnchor="middle"
            className="fill-slate-400 text-[10px] font-semibold uppercase tracking-wide"
          >
            {step === steps ? (steps === 0 ? 'Step 1' : 'Next') : `Step ${step + 1}`}
          </text>
        ))}

        {Array.from({ length: circuit.num_qubits }, (_, qubit) => {
          const y = TOP + qubit * ROW_HEIGHT;
          return (
            <g key={`wire-${qubit}`}>
              <text
                x={LEFT - 30}
                y={y + 5}
                textAnchor="end"
                className="fill-slate-700 text-[13px] font-bold"
              >
                q{qubit}
              </text>
              <text
                x={LEFT - 30}
                y={y + 20}
                textAnchor="end"
                className="fill-slate-400 text-[9px] font-medium"
              >
                c{qubit}
              </text>
              <line
                x1={LEFT - 14}
                y1={y}
                x2={wireEnd}
                y2={y}
                className="stroke-slate-300"
                strokeWidth={2}
              />
              {measured.has(qubit) ? (
                <text x={wireEnd + 6} y={y + 4} className="fill-slate-500 text-[10px] font-semibold">
                  c{qubit}
                </text>
              ) : null}
            </g>
          );
        })}

        {Array.from({ length: steps + 1 }, (_, step) =>
          Array.from({ length: circuit.num_qubits }, (_, qubit) => (
            <DropCell
              key={`cell-${step}-${qubit}`}
              step={step}
              qubit={qubit}
              x={LEFT + step * STEP_WIDTH + 7}
              y={TOP + qubit * ROW_HEIGHT - GATE_H / 2 - 5}
              width={STEP_WIDTH - 14}
              height={GATE_H + 10}
              onActivate={() => onCellClick(qubit, step)}
            />
          )),
        )}

        {circuit.gates.map((gate, index) => (
          <GateShape
            key={`gate-${index}`}
            gate={gate}
            index={index}
            x={LEFT + index * STEP_WIDTH + STEP_WIDTH / 2}
            selected={selectedGateIndex === index}
            interactive={pendingGate === null}
            onSelect={onGateSelect}
          />
        ))}

        {pendingControl !== null ? (
          <g aria-hidden="true">
            <circle
              cx={LEFT + (pendingControlStep ?? 0) * STEP_WIDTH + STEP_WIDTH / 2}
              cy={TOP + pendingControl * ROW_HEIGHT}
              r={18}
              className="fill-none stroke-indigo-500"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
