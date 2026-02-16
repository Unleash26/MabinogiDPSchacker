import { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../AppContext';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import PlayerDamagePieChart from './PlayerDamagePieChart';
import DamageOverTimeLineGraph from './DamageOverTimeLineGraph';
import LinearProgress from '@mui/material/LinearProgress';
import LogStream from './LogStream';
import PlayerDamageGauge from './PlayerDamageGauge';
import SkillDamagePieChart from './SkillDamagePieChart';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';

const fontStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif'
};

const RecordingButtonStyle = {
    width: '100%',
    height: 80,
    fontSize: '1.1rem',
    fontWeight: 'bold',
    borderRadius: '16px',
    textTransform: 'none',
    boxShadow: '0px 4px 12px rgba(0,0,0,0.3)',
};

function transformDataPieDamage(apiData) {
    return apiData.map(item => ({
        id: item.id, // ★重要: 名前引き換えのためにIDも持っておく
        label: item.label,
        value: item.data.reduce((sum, d) => sum + d, 0)
    }));
}

function transformDataLineChartDamage(apiData) {
    return apiData.map(item => ({
        id: item.id,
        label: item.label,
        data: item.data,
        area: false,
        showMark: false,
    }));
}

export default function LiveMenu() {
    // ★名簿 (playerNames) と除外ロジック (isEnemyExcluded) をここで受け取る！
    const { pollingRate = 1000, playerNames = {}, isEnemyExcluded } = useContext(AppContext) || {};

    const [recording, setRecording] = useState(false);
    const [damagePieChartData, setDamagePieChartData] = useState([]);
    const [, setTotalDamage] = useState(0);
    const [damageOverTimeData, setDamageOverTimeData] = useState([]);
    const [startUT, setStartUT] = useState(0);
    const lastFetchedIdRef = useRef(0);

    const [averageDPS, setAverageDPS] = useState(0);
    const [DPS, setDPS] = useState(0);
    const lastTotalDamageRef = useRef(0);

    // スキル別ダメージ機能
    const [skillDamageData, setSkillDamageData] = useState([]);
    // プレイヤー別スキルダメージを保持
    const [skillDamageByPlayer, setSkillDamageByPlayer] = useState({});
    // キャラクター選択用
    const [selectedPlayer, setSelectedPlayer] = useState('__all__');

    const lastProcessedUtRef = useRef(null);

    async function GetNewDamageData(lastId) {
        // ★生データを取得してクライアント側で集計する方式に変更
        await fetch(`http://${window.location.hostname}:5004/Home/GetRawDamagesAfterId?lastFetchedId=${lastId}`)
            .then(response => response.json())
            .then(res => {
                if (!res || !Array.isArray(res) || res.length === 0) return null;

                // 最後に取得したIDを更新
                const newLastId = res[res.length - 1].id;
                lastFetchedIdRef.current = newLastId;

                // 1. フィルタリング (除外対象の敵IDをスキップ)
                const filteredData = res.filter(item => !isEnemyExcluded(item.enemyId));

                if (filteredData.length === 0) return;

                // 2. 集計処理 (PieChart, DoT, SkillDamage)

                // (A) PieChart Data Aggregation
                setDamagePieChartData(prev => {
                    const prevMap = new Map(prev.map(item => [item.id, item])); // IDベースで管理

                    filteredData.forEach(item => {
                        const { playerId, damage, playerName } = item;
                        // const label = playerNames[playerId] || playerName; // ラベル解決はレンダリング時にやるのでここではID重視

                        const existing = prevMap.get(playerId);
                        if (existing) {
                            prevMap.set(playerId, { ...existing, value: existing.value + damage });
                        } else {
                            prevMap.set(playerId, { id: playerId, label: playerName, value: damage });
                        }
                    });

                    return Array.from(prevMap.values()).sort((a, b) => b.value - a.value);
                });

                // (B) Total Damage
                const newTotalDamage = filteredData.reduce((sum, item) => sum + item.damage, 0);
                setTotalDamage(prev => prev + newTotalDamage);

                // (C) Damage Over Time (DoT) Aggregation
                // ここは少し複雑。既存のデータ構造に合わせて時系列データを追加していく。

                // バケット集計
                const userTimeBuckets = {}; // { playerId: { ut: damage, ... } }
                filteredData.forEach(item => {
                    const { playerId, damage, ut } = item;
                    if (!userTimeBuckets[playerId]) userTimeBuckets[playerId] = {};
                    userTimeBuckets[playerId][ut] = (userTimeBuckets[playerId][ut] || 0) + damage;
                });

                // 今回のバッチに含まれるユニークな時刻リスト (昇順)
                const uniqueUts = sortedUniqueUt(filteredData);

                setDamageOverTimeData(prev => {
                    const prevMap = new Map(prev.map(p => [p.id, { ...p }]));

                    // 1. 各ユーザーの現在の合計ダメージを取得 (ベースライン)
                    const currentTotals = new Map();
                    prevMap.forEach((val, key) => {
                        currentTotals.set(key, val.data[val.data.length - 1] || 0);
                    });

                    const allUserIds = new Set([...prevMap.keys(), ...Object.keys(userTimeBuckets).map(Number)]);

                    // 2. 重複チェック: 前回の最後と同じ時刻が今回の最初にあるか？
                    let startIndex = 0;
                    const lastUt = lastProcessedUtRef.current;

                    if (prev.length > 0 && uniqueUts.length > 0 && uniqueUts[0] === lastUt) {
                        // 重複あり！既存の最後のデータを更新する
                        startIndex = 1; // ループは次の時刻から開始

                        // 全ユーザーの最後のデータを更新
                        allUserIds.forEach(playerId => {
                            let playerEntry = prevMap.get(playerId);
                            if (playerEntry && playerEntry.data.length > 0) {
                                const damageAtOverlap = (userTimeBuckets[playerId] && userTimeBuckets[playerId][lastUt]) || 0;

                                // 既存の累積値に加算
                                const lastIdx = playerEntry.data.length - 1;
                                playerEntry.data[lastIdx] += damageAtOverlap;

                                // ベースライン（currentTotals）も更新！
                                currentTotals.set(playerId, playerEntry.data[lastIdx]);
                            }
                        });
                    }

                    // 3. 新しい時刻データを追記
                    // データがない場合でも、他のユーザーに合わせて配列を伸ばす必要はない（Rechartsが勝手に補完するか、あるいは直前の値を維持するか）
                    // ここでは「直前の値を維持（累積グラフなので）」する。
                    if (uniqueUts.length > startIndex) { // Update condition to avoid processing if only overlapping data exists
                        // 残りの時刻データを処理
                        const timestampsToProcess = uniqueUts.slice(startIndex);

                        // 新規ユーザーエントリー作成
                        allUserIds.forEach(playerId => {
                            if (!prevMap.has(playerId)) {
                                const pName = filteredData.find(d => d.playerId === playerId)?.playerName || `Player ${playerId}`;
                                // 過去分は0埋め...ではなく、開始時点が遅れただけなので0スタート
                                // ただし、既存グラフの長さに合わせる必要があるなら、それまでの累積は0として埋める
                                // ここでは、既存のグラフの長さに合わせて、その時点での累積値を0として埋める
                                const existingLength = prev.length > 0 ? prev[0].data.length : 0;
                                prevMap.set(playerId, {
                                    id: playerId,
                                    label: pName,
                                    data: new Array(existingLength).fill(0),
                                    area: false,
                                    showMark: false
                                });
                                currentTotals.set(playerId, 0);
                            }
                        });

                        // 各時刻ごとの累積計算
                        timestampsToProcess.forEach(ut => {
                            allUserIds.forEach(playerId => {
                                const playerEntry = prevMap.get(playerId);
                                let cumulative = currentTotals.get(playerId) || 0;
                                const dmg = (userTimeBuckets[playerId] && userTimeBuckets[playerId][ut]) || 0;
                                cumulative += dmg;

                                playerEntry.data.push(cumulative);
                                currentTotals.set(playerId, cumulative); // 次のループのために更新
                            });
                        });
                    }

                    return Array.from(prevMap.values());
                });

                // Update last processed UT
                if (uniqueUts.length > 0) {
                    lastProcessedUtRef.current = uniqueUts[uniqueUts.length - 1];
                }

                // (D) Skill Damage Aggregation - Server API Call
                const endUT = Math.floor(Date.now() / 1000);

                // Fetch Total Skill Damage
                fetch(`http://${window.location.hostname}:5004/Home/GetTotalDamageBySkill?start_ut=${startUT}&end_ut=${endUT}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data) setSkillDamageData(data);
                    })
                    .catch(error => console.error('Skill damage error:', error));

                // Fetch grouped skill damage
                fetch(`http://${window.location.hostname}:5004/Home/GetDamageBySkillGroupedByPlayers?start_ut=${startUT}&end_ut=${endUT}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data) {
                            setSkillDamageByPlayer(data);
                        }
                    })
                    .catch(error => console.error('Grouped Skill damage error:', error));

            })
            .catch(error => console.error('Error:', error));
    }

    // Helper for DoT: Sort unique UTs
    function sortedUniqueUt(data) {
        const uts = new Set(data.map(d => d.ut));
        return Array.from(uts).sort((a, b) => a - b);
    }

    useEffect(() => {
        if (!recording) return;
        setDamagePieChartData([])
        setTotalDamage(0)
        setDamageOverTimeData([])
        setSkillDamageData([])
        setSkillDamageByPlayer({})
        setSelectedPlayer('__all__')
        lastProcessedUtRef.current = null;

        const poll = async () => {
            await GetNewDamageData(lastFetchedIdRef.current);
        };

        poll();
        const interval = setInterval(poll, pollingRate);
        return () => clearInterval(interval);
    }, [recording, pollingRate]);

    useEffect(() => {
        const currentTotalDamage = damageOverTimeData.reduce((sum, series) => {
            const last = series?.data?.at(-1) ?? 0;
            return sum + last;
        }, 0);

        const timePoints = damageOverTimeData.length > 0 ? damageOverTimeData[0].data.length : 1;
        setAverageDPS(currentTotalDamage / timePoints)

        const delta = currentTotalDamage - lastTotalDamageRef.current;
        setDPS(delta);
        lastTotalDamageRef.current = currentTotalDamage;
    }, [damageOverTimeData])

    const toggleRecording = async () => {
        if (recording) {
            const endUT = Math.floor(Date.now() / 1000);
            fetch(`http://${window.location.hostname}:5004/Home/PostRecording`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "unnamed",
                    start_ut: startUT,
                    end_ut: endUT,
                })
            }).catch(error => console.error('Error:', error));

        } else {
            // Start Recording: Set new baseline for overlay
            // ADDED TIMESTAMP TO PREVENT CACHING. This is critical for GET requests that change state.
            fetch(`http://${window.location.hostname}:5004/Home/StartNewSession?_=${Date.now()}`)
                .then(r => console.log('[LiveMenu] StartNewSession:', r.status))
                .catch(e => console.error('[LiveMenu] StartNewSession Error:', e));
            const startTime = Math.floor(Date.now() / 1000);
            setStartUT(startTime)
        }

        await fetch(`http://${window.location.hostname}:5004/Home/GetLastDamageRowId`)
            .then(response => response.json())
            .then(res => { lastFetchedIdRef.current = res.data; })
            .catch(error => console.error('Error:', error));

        setRecording(prev => !prev)
    }

    // 選択されたプレイヤーに応じてスキルデータをフィルタ
    const filteredSkillData = (() => {
        if (selectedPlayer === '__all__') {
            return skillDamageData; // GetTotalDamageBySkill result (array)
        }

        // skillDamageByPlayer is now an array from GetDamageBySkillGroupedByPlayers
        const playerData = Array.isArray(skillDamageByPlayer)
            ? skillDamageByPlayer.find(p => p.playerId == selectedPlayer)
            : skillDamageByPlayer[selectedPlayer]; // Fallback if data structure mismatch (should be array now)

        if (!playerData || !playerData.skills) return [];

        // AnalyticsMenu passes playerData.skills directly.
        // If it's an object (key-value), convert to array. If array, return as is.
        if (Array.isArray(playerData.skills)) {
            return playerData.skills;
        }

        // Object case (fallback or old structure support)
        return Object.entries(playerData.skills)
            .map(([skillName, damage]) => ({ skillName, damage }))
            .sort((a, b) => b.damage - a.damage);
    })();

    // プルダウン用のプレイヤーリスト
    const playerList = Array.isArray(skillDamageByPlayer)
        ? skillDamageByPlayer.map(p => ({
            id: p.playerId,
            name: playerNames[p.playerId] || p.playerName || `Player ${p.playerId}`
        }))
        : Object.entries(skillDamageByPlayer).map(([id, data]) => ({
            id,
            name: playerNames[id] || data.playerName || `Player ${id}`,
        }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <Typography variant="h4" sx={{ ...fontStyle, marginBottom: "16px", fontWeight: "700", color: "#FFFFFF" }}>
                リアルタイム分析
            </Typography>

            <Paper sx={{
                padding: 3,
                backgroundColor: '#1C1C1E',
                borderRadius: '24px',
                boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                <Grid container spacing={2}>
                    <Grid item size={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {recording ?
                            <Button
                                sx={{
                                    ...RecordingButtonStyle,
                                    borderColor: '#FF453A',
                                    color: '#FF453A',
                                    backgroundColor: 'transparent',
                                    '&:hover': { backgroundColor: 'rgba(255, 69, 58, 0.1)', borderColor: '#FF453A' }
                                }}
                                variant="outlined"
                                onClick={toggleRecording}
                            >
                                計測終了
                            </Button>
                            :
                            <Button
                                sx={{
                                    ...RecordingButtonStyle,
                                    backgroundColor: '#32D74B',
                                    color: '#000000',
                                    '&:hover': { backgroundColor: '#28C040' }
                                }}
                                variant="contained"
                                onClick={toggleRecording}
                            >
                                計測開始
                            </Button>
                        }
                    </Grid>
                    <Grid item size={10}>
                        <LogStream />
                        <LinearProgress
                            value={0}
                            variant={recording ? "indeterminate" : "determinate"}
                            sx={{
                                mt: 2,
                                borderRadius: 2,
                                height: 6,
                                backgroundColor: '#2C2C2E',
                                '& .MuiLinearProgress-bar': { backgroundColor: '#32D74B' }
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            <Grid container spacing={2} alignItems="stretch" sx={{ flexGrow: 1 }}>
                <Grid item size={{ xs: 12, sm: 12, lg: 8, xl: 4 }}>
                    {/* ★修正: 円グラフの表示時に名前を差し替える！ */}
                    <PlayerDamagePieChart chartData={damagePieChartData.map(d => ({
                        ...d,
                        label: playerNames[d.id] || d.label
                    }))} />
                </Grid>
                <Grid item size={{ xs: 12, sm: 12, lg: 12, xl: 8 }}>
                    {/* ★修正: 折れ線グラフの表示時に名前を差し替える！ */}
                    <DamageOverTimeLineGraph chartData={damageOverTimeData.map(d => ({
                        ...d,
                        label: playerNames[d.id] || d.label
                    }))} start_ut={startUT} />
                </Grid>
                <Grid item size={{ xs: 12, sm: 12, lg: 8, xl: 4 }}>
                    <PlayerDamageGauge value={DPS} averageDPS={averageDPS} />
                </Grid>
                <Grid item size={{ xs: 12, sm: 12, lg: 12, xl: 8 }}>
                    <SkillDamagePieChart
                        data={filteredSkillData}
                        selectedPlayer={selectedPlayer}
                        onPlayerChange={setSelectedPlayer}
                        players={playerList}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}