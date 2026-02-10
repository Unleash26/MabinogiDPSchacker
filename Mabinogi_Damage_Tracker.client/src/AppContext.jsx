import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    console.log("★AppContext (統合版) 読み込み完了！");

    // ==========================================
    // 1. Dashboardから引っ越してきた機能 (テーマ・モード)
    // ==========================================
    const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'light');
    
    useEffect(() => {
        document.documentElement.setAttribute('data-mui-color-scheme', mode);
        localStorage.setItem('mode', mode);
    }, [mode]);

    // ==========================================
    // 2. 設定値 (バースト数など)
    // ==========================================
    const [menu, setMenu] = useState({ name: 'Live' });
    const [burstCount, setBurstCount] = useState(() => localStorage.getItem('burstCount') || 3);
    const [largestDamageInstanceCount, setLargestDamageInstanceCount] = useState(() => localStorage.getItem('largestDamageInstanceCount') || 3);
    const [pollingRate, setPollingRate] = useState(() => localStorage.getItem('pollingRate') || 1000); 

    useEffect(() => { localStorage.setItem('pollingRate', pollingRate); }, [pollingRate]);
    useEffect(() => { localStorage.setItem('burstCount', burstCount); }, [burstCount]);
    useEffect(() => { localStorage.setItem('largestDamageInstanceCount', largestDamageInstanceCount); }, [largestDamageInstanceCount]);

    // ==========================================
    // 3. 名前変更機能 (ここが本命！)
    // ==========================================
    const [playerNames, setPlayerNames] = useState({});

    const renamePlayer = (id, newName) => {
        try {
            const savedNames = JSON.parse(localStorage.getItem('custom_names') || '{}');
            savedNames[id] = newName;
            localStorage.setItem('custom_names', JSON.stringify(savedNames));
        } catch (e) { console.error(e); }

        setPlayerNames(prev => ({ ...prev, [id]: newName }));
        console.log(`名前変更成功: ${newName}`);
    };

    // 起動時に名前リストを取得
    useEffect(() => {
        const fetchNames = async () => {
            try {
                const response = await fetch(`http://${window.location.hostname}:5004/Home/GetAllPlayers`);
                const data = await response.json();
                const savedNames = JSON.parse(localStorage.getItem('custom_names') || '{}');
                if (data.value && Array.isArray(data.value)) {
                    const map = {};
                    data.value.forEach(p => {
                        map[p.playerId] = savedNames[p.playerId] || p.playerName;
                    });
                    setPlayerNames(map);
                }
            } catch (error) { console.error(error); }
        };
        fetchNames();
    }, []);

    // 全部まとめて配信！
    return (
        <AppContext.Provider value={{ 
            menu, setMenu, 
            mode, setMode, 
            playerNames, renamePlayer, 
            burstCount, setBurstCount,
            largestDamageInstanceCount, setLargestDamageInstanceCount,
            pollingRate, setPollingRate
        }}>
            {children}
        </AppContext.Provider>
    );
};