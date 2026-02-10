import React from 'react';
import { createRoot } from 'react-dom/client';
import AppTheme from './theme/AppTheme';
import { AppProvider } from './AppContext'; 

// ★修正ポイント: App ではなく MainContent を読み込む
// (もし MainContent ではなく Dashboard がメインなら、そこを書き換えてください)
import MainContent from './components/MainContent'; 

createRoot(document.getElementById('root')).render(
  // 1. テーマ設定 (ダークモード)
  <AppTheme mode="dark">
    {/* 2. データ配り係 (AppContext) */}
    <AppProvider>
       {/* 3. 実際の画面 (App ではなく MainContent を表示) */}
       <MainContent /> 
    </AppProvider>
  </AppTheme>
);