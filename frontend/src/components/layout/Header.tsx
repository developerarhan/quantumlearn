import { Atom, BookOpen, FlaskConical, Home } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/learn', label: 'Learn', icon: BookOpen, end: false },
  { to: '/playground', label: 'Playground', icon: FlaskConical, end: false },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="QuantumLearn home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
            <Atom size={20} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-slate-900">QuantumLearn</span>
            <span className="block text-[11px] font-medium uppercase tracking-widest text-indigo-600">
              Interactive lab
            </span>
          </span>
        </NavLink>

        <nav aria-label="Main navigation" className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
