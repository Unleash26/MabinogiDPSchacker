import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Dashboard from './Dashboard';
// ★追加: 機能（コンセント）を読み込む
import { AppProvider } from './AppContext'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    // ★追加: アプリ全体を AppProvider で包んで、機能を使えるようにする
    <AppProvider>
        <Dashboard />
    </AppProvider>
);

reportWebVitals();