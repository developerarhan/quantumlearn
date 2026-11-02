import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { CircuitProvider } from './state/circuit';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CircuitProvider>
        <App />
      </CircuitProvider>
    </BrowserRouter>
  </StrictMode>,
);
