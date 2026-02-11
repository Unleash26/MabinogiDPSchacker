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
    // ★名簿 (playerNames) をここで受け取る！
    const { pollingRate = 1000, playerNames = {} } = useContext(AppContext) || {};

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

    async function GetNewDamageData(lastId) {
        await fetch(`http://${window.location.hostname}:5004/Home/GetAllDamagesGroupedByPlayersAfterId?lastFetchedId=${lastId}`)
            .then(response => response.json())
            .then(res => {
                if (!res) return null

                lastFetchedIdRef.current = res.lastId
                const data = res.data
                const newPieChartData = transformDataPieDamage(data);

                setDamagePieChartData(prev => {
                    // ★IDを保持しつつマージするようにロジック修正
                    const prevMap = new Map(prev.map(item => [item.label, item]));

                    newPieChartData.forEach((newItem) => {
                        const { label, value, id } = newItem;
                        const existing = prevMap.get(label);
                        if (existing) {
                            // 既存があれば値を足し、IDも更新（最新のものに）
                            prevMap.set(label, { ...existing, value: existing.value + value, id });
                        } else {
                            // 新規ならそのままセット
                            prevMap.set(label, { label, value, id });
                        }
                    });

                    return Array.from(prevMap.values()).sort((a, b) => b.value - a.value);
                });

                const newTotalDamage = newPieChartData.reduce((prev, curr) => prev + curr.value, 0)
                setTotalDamage((prev) => prev + newTotalDamage)

                const newDoTData = transformDataLineChartDamage(data);

                setDamageOverTimeData(prev => {
                    const prevMap = new Map(prev.map(p => [p.id, { ...p }]));
                    const updatedIds = new Set();
                    const pointsAdded = newDoTData.length > 0 ? newDoTData[0].data.length : 0;

                    newDoTData.forEach(({ id, label, data, area, showMark }) => {
                        updatedIds.add(id);

                        if (prevMap.has(id)) {
                            const existingData = prevMap.get(id).data;
                            const lastTotal = existingData[existingData.length - 1] || 0;

                            const cumulativeData = data.reduce((acc, dmg, i) => {
                                acc.push((i === 0 ? lastTotal : acc[i - 1]) + dmg);
                                return acc;
                            }, []);

                            prevMap.get(id).data = existingData.concat(cumulativeData);
                        } else {
                            const longestHistory = prev.length === 0 ? 0 : Math.max(...prev.map(p => p.data.length));
                            const zeroHistory = new Array(longestHistory).fill(0);
                            const cumulativeData = data.reduce((acc, dmg, i) => {
                                acc.push((acc[i - 1] || 0) + dmg);
                                return acc;
                            }, []);

                            const newData = zeroHistory.concat(cumulativeData)
                            prevMap.set(id, { id, label, data: newData, area, showMark });
                        }
                    });

                    if (pointsAdded > 0) {
                        for (const player of prevMap.values()) {
                            if (!updatedIds.has(player.id)) {
                                const existingData = player.data;
                                const lastTotal = existingData.length > 0 ? existingData[existingData.length - 1] : 0;
                                player.data = existingData.concat(new Array(pointsAdded).fill(lastTotal));
                            }
                        }
                    }

                    return Array.from(prevMap.values())
                });
            })
            .catch(error => console.error('Error:', error));

        // スキル別ダメージを取得（プレイヤーごとに保持）
        await fetch(`http://${window.location.hostname}:5004/Home/GetDamageBySkillAfterId?lastFetchedId=${lastId}`)
            .then(response => response.json())
            .then(res => {
                if (!res || !res.data) return;

                // プレイヤー別スキルダメージを更新
                setSkillDamageByPlayer(prev => {
                    const updated = { ...prev };
                    res.data.forEach(player => {
                        const playerId = player.playerId;
                        const playerName = playerNames[playerId] || player.playerName || `Player ${playerId}`;
                        if (!updated[playerId]) {
                            updated[playerId] = { playerName, skills: {} };
                        }
                        updated[playerId].playerName = playerName;
                        (player.skills || []).forEach(skill => {
                            updated[playerId].skills[skill.skillName] =
                                (updated[playerId].skills[skill.skillName] || 0) + skill.damage;
                        });
                    });
                    return updated;
                });

                // 全体集計も更新
                setSkillDamageData(prev => {
                    const skillMap = new Map(prev.map(s => [s.skillName, s.damage]));
                    res.data.forEach(player => {
                        (player.skills || []).forEach(skill => {
                            skillMap.set(skill.skillName, (skillMap.get(skill.skillName) || 0) + skill.damage);
                        });
                    });
                    return Array.from(skillMap.entries())
                        .map(([skillName, damage]) => ({ skillName, damage }))
                        .sort((a, b) => b.damage - a.damage);
                });
            })
            .catch(error => console.error('スキルダメージ取得エラー:', error));
    }

    useEffect(() => {
        if (!recording) return;
        setDamagePieChartData([])
        setTotalDamage(0)
        setDamageOverTimeData([])
        setSkillDamageData([])
        setSkillDamageByPlayer({})
        setSelectedPlayer('__all__')

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
            return skillDamageData;
        }
        const playerData = skillDamageByPlayer[selectedPlayer];
        if (!playerData) return [];
        return Object.entries(playerData.skills)
            .map(([skillName, damage]) => ({ skillName, damage }))
            .sort((a, b) => b.damage - a.damage);
    })();

    // プルダウン用のプレイヤーリスト
    const playerList = Object.entries(skillDamageByPlayer).map(([id, data]) => ({
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