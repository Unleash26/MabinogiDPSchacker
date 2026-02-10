import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../AppContext'
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import DamageCard from './DamageCard';
import PlayerCountCard from './PlayerCountCard';
import TimeCard from './TimeCard';
import TrimLineGraph from './TrimLineGraph';
import PlayerDamagePieChart from './PlayerDamagePieChart';
import DecoratedDamageOverTimeLineGraph from './DecoratedDamageOverTimeLineGraph';
import DamageScatterPlot from './DamageScatterPlot';
import LargestHitCard from './LargestHitCard';
import BurstCard from './BurstCard';
import HealingCard from './HealingCard';
import SkillDamagePieChart from './SkillDamagePieChart';

function formatTimeStamp(ut) {
    return new Date((ut) * 1000).toLocaleTimeString(
        [],
        { hour: 'numeric', minute: '2-digit', second: '2-digit' }
    );
}

function transformDataPieDamage(apiData, playerNames) {
    return apiData.map(item => ({
        label: playerNames[item.id] || item.label,
        value: item.data.at(-1)
    }));
}

function transformDataLineChartDamage(apiData, playerNames) {
    return apiData.map(item => ({
        type: "line",
        id: item.id,
        label: playerNames[item.id] || item.label,
        data: item.data,
        area: false,
        showMark: false,
    }));
}

export default function AnalyticsMenu({ start_ut, end_ut }) {
    const { burstCount, largestDamageInstanceCount, playerNames } = useContext(AppContext)
    const [damageOverTimeData, setDamageOverTimeData] = useState([])
    const [damagePieChartData, setDamagePieChartData] = useState([])
    const [combinedDamageOverTimeData, setCombinedDamageOverTimeData] = useState([])
    const [totalDamage, setTotalDamage] = useState(0)
    const [totalHealing, setTotalHealing] = useState(0)
    const [numberOfPlayer, setNumberOfPlayers] = useState(0)
    const [largestDamageInstances, setLargestDamageInstances] = useState([])
    const [graphLargestDamageInstance, setGraphLargestDamageInstance] = useState(null)
    const [bands, setBands] = useState([])
    const [graphBands, setGraphBands] = useState([])
    // Scatter Plot
    const [scatterPlotSeries, setScatterPlotSeries] = useState([]);

    // スキル別ダメージ
    const [skillDamageData, setSkillDamageData] = useState([]);


    useEffect(() => {

        // GetDamangeBands()
        async function getDamageBands() {
            const newBands = []
            const newGraphBands = []
            await fetch(`http://${window.location.hostname}:5004/Home/GetListOfDistinctBiggestBurstofDamageInUTBetweenTimes?start_ut=${start_ut}&end_ut=${end_ut}&burst_timeframe=${60}&count=${burstCount}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const bands = data.map((res) => {
                            const band = {
                                label: '60秒',
                                start: formatTimeStamp(res.unix_timestamp),
                                end: formatTimeStamp(res.unix_timestamp + 60),
                                ...res,
                                player_name: playerNames[res.player_id] || res.player_name,
                            }
                            return band
                        })
                        newGraphBands.push(bands[0])
                        newBands.push(bands)
                    }
                })
                .catch(err => console.error('60s burst fetch error:', err))

            await fetch(`http://${window.location.hostname}:5004/Home/GetListOfDistinctBiggestBurstofDamageInUTBetweenTimes?start_ut=${start_ut}&end_ut=${end_ut}&burst_timeframe=${30}&count=${burstCount}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const bands = data.map((res) => {
                            const band = {
                                label: '30秒',
                                start: formatTimeStamp(res.unix_timestamp),
                                end: formatTimeStamp(res.unix_timestamp + 60),
                                ...res,
                                player_name: playerNames[res.player_id] || res.player_name,
                            }
                            return band
                        })
                        newGraphBands.push(bands[0])
                        newBands.push(bands)
                    }
                })
                .catch(err => console.error('30s burst fetch error:', err))

            await fetch(`http://${window.location.hostname}:5004/Home/GetListOfDistinctBiggestBurstofDamageInUTBetweenTimes?start_ut=${start_ut}&end_ut=${end_ut}&burst_timeframe=${15}&count=${burstCount}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const bands = data.map((res) => {
                            const band = {
                                label: '15秒',
                                start: formatTimeStamp(res.unix_timestamp),
                                end: formatTimeStamp(res.unix_timestamp + 60),
                                ...res,
                                player_name: playerNames[res.player_id] || res.player_name,
                            }
                            return band
                        })
                        newGraphBands.push(bands[0])
                        newBands.push(bands)
                    }
                })
                .catch(err => console.error('15s burst fetch error:', err))
            setGraphBands(newGraphBands)
            setBands(newBands)
        }
        // End of GetDamangeBands()


        fetch(`http://${window.location.hostname}:5004/Home/GetAggregatedDamageSeriesGroupedByPlayers?start_ut=${start_ut}&end_ut=${end_ut}`)
            .then(response => response.json())
            .then(data => {
                const sortedData = data.sort((a, b) => {
                    const damageA = a.data.at(-1)
                    const damageB = b.data.at(-1)

                    if (damageA > damageB) {
                        return -1;
                    } else if (damageA < damageB) {
                        return 1;
                    } else {
                        return 0;
                    }
                });

                const newLineChartData = transformDataLineChartDamage(sortedData, playerNames)
                setDamageOverTimeData(newLineChartData);

                const newCombinedDamageOverTimeData = newLineChartData[0]?.data?.map((_, index) =>
                    newLineChartData.reduce((sum, series) => sum + (series.data[index] ?? 0), 0)
                ) ?? [];

                setCombinedDamageOverTimeData(newCombinedDamageOverTimeData)

                const newPieChartData = transformDataPieDamage(sortedData, playerNames)
                setDamagePieChartData(newPieChartData);

                const newTotalDamage = newCombinedDamageOverTimeData.at(-1);
                setTotalDamage(newTotalDamage)

                const newNumberOfPlayers = newLineChartData.length
                setNumberOfPlayers(newNumberOfPlayers)
            })
            .catch(error => console.error('Error:', error));

        fetch(`http://${window.location.hostname}:5004/Home/GetListOfDistinctLargestSingleDamageInstance?start_ut=${start_ut}&end_ut=${end_ut}&count=${largestDamageInstanceCount}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    // Apply custom nicknames
                    const mappedData = data.map(item => ({
                        ...item,
                        player_name: playerNames[item.player_id] || item.player_name
                    }));
                    setLargestDamageInstances(mappedData)
                    setGraphLargestDamageInstance(mappedData[0])
                }
            })
            .catch(error => console.error('LargestDamageInstance error:', error))

        fetch(`http://${window.location.hostname}:5004/Home/GetTotalPlayerHealing?start_ut=${start_ut}&end_ut=${end_ut}`)
            .then(response => response.json())
            .then(data => {
                setTotalHealing(data)
            })


        fetch(`http://${window.location.hostname}:5004/Home/GetDamagesBetweenUt?start_ut=${start_ut}&end_ut=${end_ut}`)
            .then(response => response.json())
            .then(data => {
                if (!data || data.length === 0) return;
                const dmgMap = new Map();
                const playerIdMap = new Map();

                const series = data.reduce((series, damage_simple) => {
                    const displayName = playerNames[damage_simple.player_id] || damage_simple.player_name;
                    let entry = series.find((element) => element.playerId === damage_simple.player_id);

                    if (!entry) {
                        entry = {
                            playerId: damage_simple.player_id,
                            label: displayName,
                            highlightScope: { highlight: 'series', fade: 'global' },
                            markerSize: 2,
                            data: [],
                        }
                        dmgMap.set(damage_simple.player_id, 0)
                        series.push(entry)
                    }

                    entry.data.push({
                        x: damage_simple.unix_timestamp,
                        y: damage_simple.damage,
                        id: entry.data.length
                    });

                    dmgMap.set(damage_simple.player_id, dmgMap.get(damage_simple.player_id) + damage_simple.damage);

                    return series
                }, []);

                series.sort((a, b) => dmgMap.get(b.playerId) - dmgMap.get(a.playerId))

                setScatterPlotSeries(series)
            })

        // スキル別ダメージを取得（全プレイヤー合計）
        fetch(`http://${window.location.hostname}:5004/Home/GetTotalDamageBySkill?start_ut=${start_ut}&end_ut=${end_ut}`)
            .then(response => response.json())
            .then(data => {
                if (data) setSkillDamageData(data);
            })
            .catch(error => console.error('Skill damage error:', error));

        getDamageBands()
    }, [start_ut, end_ut, burstCount, largestDamageInstanceCount]);

    return (
        <Box>
            <Typography variant="h2" sx={{ marginBottom: "8px" }}>DPS詳細検索</Typography>
            <Grid container spacing={{ xs: 1, md: 2 }} alignItems="stretch" sx={{ flexGrow: 1 }}>
                { /* Total Damage Card */}
                <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ height: '220px' }} >
                    {combinedDamageOverTimeData ?
                        <DamageCard chartData={combinedDamageOverTimeData} totalDamage={totalDamage} />
                        :
                        <Skeleton variant="rounded" />
                    }
                </Grid>
                { /* Number of Players Card */}
                <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ height: '220px' }}>
                    {numberOfPlayer ?
                        <PlayerCountCard count={numberOfPlayer} />
                        :
                        <Skeleton variant="rounded" />
                    }
                </Grid>
                { /* Time Card */}
                <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ height: '220px' }}>
                    <TimeCard length_ut={end_ut - start_ut} />
                </Grid>
                { /* Largest Damage Instance Card */}
                <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ height: '220px' }}>
                    {(largestDamageInstances && largestDamageInstances.length > 0) ?
                        <LargestHitCard largestDamageInstances={largestDamageInstances} setGraphLargestDamageInstance={setGraphLargestDamageInstance} />
                        :
                        <Skeleton variant="rounded" />
                    }
                </Grid>
                { /* Largets Burst Cards */}
                {(bands && bands.length > 0) ?
                    bands.map((band, index) =>
                        <Grid key={`band_${index}`} size={{ xs: 12, sm: 6, lg: 3 }} sx={{ height: '250px' }}>
                            <BurstCard bands={band} graphBands={graphBands} setGraphBands={setGraphBands} />
                        </Grid>
                    )
                    : null
                }
                { /* Total Healing Card */}
                <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{}}>
                    {combinedDamageOverTimeData ?
                        <HealingCard totalHealing={totalHealing} />
                        :
                        <Skeleton variant="rounded" />
                    }
                </Grid>
                { /* Player Damange Pie Chart */}
                <Grid size={{ xs: 12, sm: 12, lg: 8, xl: 4 }} >
                    <PlayerDamagePieChart chartData={damagePieChartData} />
                </Grid>
                { /* Player Damage Line Chart */}
                <Grid size={{ xs: 12, sm: 12, lg: 12, xl: 8 }} >
                    {(damageOverTimeData.length > 0) ?
                        <DecoratedDamageOverTimeLineGraph chartData={damageOverTimeData} bands={graphBands} largestDamageInstance={graphLargestDamageInstance} start_ut={start_ut} />
                        :
                        <Skeleton variant="rounded" />
                    }
                </Grid>
                { /* Player Damage Scatter Plot */}
                <Grid size={{ xs: 12, sm: 12, lg: 12, xl: 12 }} >
                    {(scatterPlotSeries.length > 0) ?
                        <DamageScatterPlot series={scatterPlotSeries} />
                        :
                        <Skeleton variant="rounded" />
                    }
                </Grid>
                { /* Skill Damage Pie Chart */}
                <Grid size={{ xs: 12, sm: 12, lg: 8, xl: 4 }} >
                    <SkillDamagePieChart data={skillDamageData} />
                </Grid>
                { /* Trim Line Graph */}
                <Grid size={12} >
                    {combinedDamageOverTimeData.length !== 0 ? (
                        <TrimLineGraph chartData={combinedDamageOverTimeData} start_ut={start_ut} end_ut={end_ut} />
                    ) : (
                        <Skeleton variant="rounded" />
                    )
                    }
                </Grid>
            </Grid>
        </Box >
    );
}
