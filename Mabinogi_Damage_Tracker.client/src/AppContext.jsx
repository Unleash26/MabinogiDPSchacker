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

        // Also persist to DB so overlay (WebView2) can read it
        fetch(`http://${window.location.hostname}:5004/Home/UpdatePlayerName?playerId=${id}&newName=${encodeURIComponent(newName)}`, {
            method: 'POST'
        }).catch(e => console.error('DB name update failed:', e));

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

                // data.value is sometimes wrapped, sometimes direct list depending on API response format in previous code. 
                // Checking if it's array or wrapped in value.
                const playersList = Array.isArray(data) ? data : (data.value || []);

                if (Array.isArray(playersList)) {
                    const map = {};
                    playersList.forEach(p => {
                        const localName = savedNames[p.playerId];
                        // Sync: If we have a local name but DB has something else, push local name to DB
                        if (localName && localName !== p.playerName) {
                            fetch(`http://${window.location.hostname}:5004/Home/UpdatePlayerName?playerId=${p.playerId}&newName=${encodeURIComponent(localName)}`, {
                                method: 'POST'
                            }).catch(e => console.error('Auto-sync name failed:', e));
                        }

                        map[p.playerId] = localName || p.playerName;
                    });
                    setPlayerNames(map);
                }
            } catch (error) { console.error(error); }
        };
        fetchNames();
    }, []);

    // ==========================================
    // 4. ターゲット除外機能 (Target Filtering)
    // ==========================================
    const [excludedEnemyIds, setExcludedEnemyIds] = useState(() => JSON.parse(localStorage.getItem('excludedEnemyIds') || '[]'));
    const [enemyNameMap, setEnemyNameMap] = useState([]);

    // 起動時に敵の名前リスト（JSON）を読み込む
    useEffect(() => {
        fetch('/enemy_names.json')
            .then(res => res.json())
            .then(data => setEnemyNameMap(data))
            .catch(err => console.error("Failed to load enemy_names.json:", err));
    }, []);

    //save excluded ID's
    useEffect(() => {
        localStorage.setItem('excludedEnemyIds', JSON.stringify(excludedEnemyIds));
    }, [excludedEnemyIds]);

    // ヘルパー: 指定された enemyId が除外対象かチェック
    // excludedEnemyIds に含まれる文字列で「始まる」IDを除外する
    const isEnemyExcluded = (enemyId) => {
        const strId = String(enemyId);
        return excludedEnemyIds.some(prefix => strId.startsWith(prefix));
    };

    const toggleExclusion = (prefix) => {
        setExcludedEnemyIds(prev => {
            if (prev.includes(prefix)) {
                return prev.filter(id => id !== prefix);
            } else {
                return [...prev, prefix];
            }
        });
    };

    // 全部まとめて配信！
    return (
        <AppContext.Provider value={{
            menu, setMenu,
            mode, setMode,
            playerNames, renamePlayer,
            burstCount, setBurstCount,
            largestDamageInstanceCount, setLargestDamageInstanceCount,
            pollingRate, setPollingRate,
            // Target Filtering
            excludedEnemyIds, toggleExclusion, isEnemyExcluded, enemyNameMap
        }}>
            {children}
        </AppContext.Provider>
    );
};