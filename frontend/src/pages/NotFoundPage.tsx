import { Compass, Home, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Compass size={30} aria-hidden="true" />
      </span>
      <p className="mt-5 font-mono text-sm font-bold text-indigo-600">404</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">This path is not in the circuit</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        The page you requested does not exist. Use one of the working routes below to continue learning or
        experimenting.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn-primary">
          <Home size={15} aria-hidden="true" /> Home
        </Link>
        <Link to="/learn" className="btn-secondary">
          Browse lessons
        </Link>
        <Link to="/playground" className="btn-secondary">
          <Play size={15} aria-hidden="true" /> Playground
        </Link>
      </div>
    </div>
  );
}
