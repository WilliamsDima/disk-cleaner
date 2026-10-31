import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './app/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Не найден корневой элемент');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
