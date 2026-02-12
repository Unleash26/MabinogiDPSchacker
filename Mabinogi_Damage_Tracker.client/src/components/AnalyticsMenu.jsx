import { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../AppContext'
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import html2canvas from 'html2canvas';

import DamageCard from './DamageCard';
import PlayerCountCard from './PlayerCountCard';
import TimeCard from './TimeCard';
import TrimLineGraph from './TrimLineGraph';
import PlayerDamagePieChart from './PlayerDamagePieChart';
import DecoratedDamageOverTimeLineGraph from './DecoratedDamageOverTimeLineGraph';
// import DamageScatterPlot from './DamageScatterPlot'; // Removed
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
        id: item.id,
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

// Helper component for dashboard content
function AnalyticsDashboardContent({
    isCapture,
    combinedDamageOverTimeData,
    totalDamage,
    numberOfPlayer,
    end_ut,
    start_ut,
    largestDamageInstances,
    setGraphLargestDamageInstance,
    bands,
    graphBands,
    setGraphBands,
    totalHealing,
    damagePieChartData,
    damageOverTimeData,
    graphLargestDamageInstance
}) {
    // Define grid sizes based on mode
    const gridSizes = isCapture ? {
        // Capture Mode: Compact & Square-ish
        basicStats: { xs: 6, md: 3 },
        pieChart: { xs: 12, md: 4 },
        lineChart: { xs: 12, md: 8 }
    } : {
        // Normal Mode: Responsive
        basicStats: { xs: 12, sm: 6, lg: 3 },
        pieChart: { xs: 12, sm: 12, lg: 8, xl: 4 },
        lineChart: { xs: 12, sm: 12, lg: 12, xl: 8 }
    };

    return (
        <Grid
            container
            spacing={2}
            alignItems="stretch"
        >
            {/* Row 1: Basic Stats */}
            <Grid container size={12} spacing={2}>
                <Grid size={gridSizes.basicStats} sx={{ height: isCapture ? '180px' : '220px' }} >
                    {combinedDamageOverTimeData ?
                        <DamageCard chartData={combinedDamageOverTimeData} totalDamage={totalDamage} />
                        :
                        <Skeleton variant="rounded" height="100%" />
                    }
                </Grid>
                <Grid size={gridSizes.basicStats} sx={{ height: isCapture ? '180px' : '220px' }}>
                    {numberOfPlayer ?
                        <PlayerCountCard count={numberOfPlayer} />
                        :
                        <Skeleton variant="rounded" height="100%" />
                    }
                </Grid>
                <Grid size={gridSizes.basicStats} sx={{ height: isCapture ? '180px' : '220px' }}>
                    <TimeCard length_ut={end_ut - start_ut} />
                </Grid>
                <Grid size={gridSizes.basicStats} sx={{ height: isCapture ? '180px' : '220px' }}>
                    {(largestDamageInstances && largestDamageInstances.length > 0) ?
                        <LargestHitCard largestDamageInstances={largestDamageInstances} setGraphLargestDamageInstance={setGraphLargestDamageInstance} />
                        :
                        <Skeleton variant="rounded" height="100%" />
                    }
                </Grid>
            </Grid>

            {/* Row 2: Bursts & Healing */}
            <Grid container size={12} spacing={2}>
                {(bands && bands.length > 0) ?
                    bands.map((band, index) =>
                        <Grid key={`band_${index}`} size={gridSizes.basicStats} sx={{ height: isCapture ? '180px' : '250px' }}>
                            <BurstCard bands={band} graphBands={graphBands} setGraphBands={setGraphBands} />
                        </Grid>
                    )
                    : null
                }
                <Grid size={gridSizes.basicStats} sx={{ height: isCapture ? '180px' : 'auto' }}>
                    {combinedDamageOverTimeData ?
                        <HealingCard totalHealing={totalHealing} />
                        :
                        <Skeleton variant="rounded" height="100%" />
                    }
                </Grid>
            </Grid>

            {/* Row 3: Charts */}
            <Grid container size={12} spacing={2}>
                <Grid size={gridSizes.pieChart} sx={{ height: isCapture ? 'auto' : 'auto' }}>
                    <PlayerDamagePieChart chartData={damagePieChartData} height={isCapture ? '100%' : '300px'} />
                </Grid>

                <Grid size={gridSizes.lineChart} sx={{ height: isCapture ? 'auto' : 'auto' }}>
                    {(damageOverTimeData.length > 0) ?
                        <DecoratedDamageOverTimeLineGraph chartData={damageOverTimeData} bands={graphBands} largestDamageInstance={graphLargestDamageInstance} start_ut={start_ut} />
                        :
                        <Skeleton variant="rounded" height="100%" />
                    }
                </Grid>
            </Grid>
        </Grid>
    );
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
    // Scatter Plot Removed
    // const [scatterPlotSeries, setScatterPlotSeries] = useState([]);

    // スキル別ダメージ
    const [skillDamageData, setSkillDamageData] = useState([]);
    const [groupedSkillDamageData, setGroupedSkillDamageData] = useState([]);
    const [selectedSkillPlayer, setSelectedSkillPlayer] = useState("__all__");

    // Screenshot feature
    const captureRef = useRef(null);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("Screenshot copied to clipboard!"); // メッセージを動的に
    const [isCapturing, setIsCapturing] = useState(false);

    const handleScreenshot = async () => {
        if (!captureRef.current || isCapturing) return;

        setIsCapturing(true);

        try {
            const canvas = await html2canvas(captureRef.current, {
                backgroundColor: '#101010', // Dark background for the image to match theme
                scale: 1, // Default scale
                useCORS: true, // Handle external images if any
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    console.error("Failed to generate blob");
                    setSnackbarMessage("Failed to generate image.");
                    setOpenSnackbar(true);
                    setIsCapturing(false);
                    return;
                }

                // クリップボードへの書き込みを試みる
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    setSnackbarMessage("Screenshot copied to clipboard!");
                    setOpenSnackbar(true);
                } catch (err) {
                    // クリップボード書き込みに失敗した場合（HTTP環境など）はダウンロードに切り替える
                    console.warn("Clipboard write failed, falling back to download:", err);

                    const link = document.createElement('a');
                    link.download = `dps_report_${new Date().getTime()}.png`;
                    link.href = URL.createObjectURL(blob);
                    link.click();

                    // ダウンロードしたことをユーザーに伝える（AlertではなくSnackbarで）
                    setSnackbarMessage("Clipboard failed. Image downloaded.");
                    setOpenSnackbar(true);
                } finally {
                    setIsCapturing(false);
                }
            });
        } catch (err) {
            console.error("Screenshot failed:", err);
            setSnackbarMessage("Screenshot failed.");
            setOpenSnackbar(true);
            setIsCapturing(false);
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setOpenSnackbar(false);
    };


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




        /* Scatter Plot fetch removed */
        /*
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
        */

        // スキル別ダメージを取得（全プレイヤー合計）
        fetch(`http://${window.location.hostname}:5004/Home/GetTotalDamageBySkill?start_ut=${start_ut}&end_ut=${end_ut}`)
            .then(response => response.json())
            .then(data => {
                if (data) setSkillDamageData(data);
            })
            .catch(error => console.error('Skill damage error:', error));

        fetch(`http://${window.location.hostname}:5004/Home/GetDamageBySkillGroupedByPlayers?start_ut=${start_ut}&end_ut=${end_ut}`)
            .then(response => response.json())
            .then(data => {
                if (data) setGroupedSkillDamageData(data);
            })
            .catch(error => console.error('Grouped Skill damage error:', error));

        getDamageBands()
    }, [start_ut, end_ut, burstCount, largestDamageInstanceCount]);

    const dashboardProps = {
        combinedDamageOverTimeData,
        totalDamage,
        numberOfPlayer,
        end_ut,
        start_ut,
        largestDamageInstances,
        setGraphLargestDamageInstance,
        bands,
        graphBands,
        setGraphBands,
        totalHealing,
        damagePieChartData,
        damageOverTimeData,
        graphLargestDamageInstance
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: "8px" }}>
                <Typography variant="h2">DPS詳細検索</Typography>
                <Button
                    variant="outlined"
                    startIcon={isCapturing ? <CircularProgress size={20} color="inherit" /> : <ContentCopyIcon />}
                    onClick={handleScreenshot}
                    disabled={isCapturing}
                    sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
                        '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' }
                    }}
                >
                    {isCapturing ? "Capturing..." : "Copy Image"}
                </Button>
            </Box>

            {/* 1. Normal Responsive Display (Visible) */}
            <Box sx={{ mb: 2 }}>
                <AnalyticsDashboardContent isCapture={false} {...dashboardProps} />
            </Box>

            {/* 2. Hidden Capture Display (Fixed Layout) */}
            <Box
                ref={captureRef}
                sx={{
                    position: 'fixed',
                    left: '-10000px',
                    top: 0,
                    width: '1200px', // Fixed width for screenshot
                    backgroundColor: '#101010',
                    p: 2,
                    borderRadius: 1,
                    // Ensure text color and other styles are correct for dark mode
                    color: 'white',
                    // Override styles for child Paper components (Cards) during capture to fix "weird edges"
                    '& .MuiPaper-root': {
                        boxShadow: 'none !important', // Remove box-shadow to prevent artifacts
                        border: '1px solid #333333 !important', // Use solid border color instead of rgba
                        backgroundColor: '#1C1C1E !important', // Ensure background is solid
                        backgroundImage: 'none !important', // Remove any potential gradient overlays
                    }
                }}
            >
                <AnalyticsDashboardContent isCapture={true} {...dashboardProps} />
            </Box>

            {/* キャプチャ対象外のエリア (Skill Breakdown etc) */}
            <Grid
                container
                spacing={{ xs: 1, md: 2 }}
                alignItems="stretch"
                sx={{ flexGrow: 1 }}
            >
                { /* Player Damage Scatter Plot - REMOVED */}
                { /*
                <Grid size={{ xs: 12, sm: 12, lg: 12, xl: 12 }} >
                    {(scatterPlotSeries.length > 0) ?
                        <DamageScatterPlot series={scatterPlotSeries} />
                        :
                        <Skeleton variant="rounded" />
                    }
                </Grid>
                */ }
                { /* Skill Damage Pie Chart */}
                <Grid size={{ xs: 12, sm: 12, lg: 12, xl: 8 }} >
                    <SkillDamagePieChart
                        data={selectedSkillPlayer === "__all__" ? skillDamageData : (groupedSkillDamageData.find(p => p.playerId == selectedSkillPlayer)?.skills || [])}
                        selectedPlayer={selectedSkillPlayer}
                        onPlayerChange={setSelectedSkillPlayer}
                        players={damagePieChartData.map(d => ({ id: d.id, name: d.label }))}
                    />
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

            <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box >
    );
}
