import { python } from '@codemirror/lang-python';
import CodeMirror from '@uiw/react-codemirror';

interface PythonCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PythonCodeEditor({ value, onChange, disabled = false }: PythonCodeEditorProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-300 bg-white text-left shadow-inner focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200"
      data-testid="python-editor"
    >
      <CodeMirror
        value={value}
        height="340px"
        extensions={[python()]}
        onChange={onChange}
        editable={!disabled}
        readOnly={disabled}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          autocompletion: false,
          bracketMatching: true,
          closeBrackets: true,
        }}
        aria-label="Restricted Qiskit-style Python editor"
      />
    </div>
  );
}
