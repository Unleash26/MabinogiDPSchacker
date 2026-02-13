import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Dashboard from './Dashboard';
import { AppProvider } from './AppContext';
import CompactView from './components/CompactView';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Simple routing based on URL path
const isCompact = window.location.pathname === '/compact';

root.render(
    // ★追加: アプリ全体を AppProvider で包んで、機能を使えるようにする
    <AppProvider>
        {isCompact ? <CompactView /> : <Dashboard />}
    </AppProvider>
);

reportWebVitals();