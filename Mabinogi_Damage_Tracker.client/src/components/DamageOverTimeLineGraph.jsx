import { LineChart } from '@mui/x-charts/LineChart';
import { Paper, Typography, Box } from '@mui/material';

// デザイン共通設定
const fontStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif'
};

function formatLargeNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';

    const absNum = Math.abs(num);
    let formatted;

    if (absNum >= 1e12) {
        formatted = (num / 1e12).toFixed(1) + 'T';
    } else if (absNum >= 1e9) {
        formatted = (num / 1e9).toFixed(1) + 'B';
    } else if (absNum >= 1e6) {
        formatted = (num / 1e6).toFixed(1) + 'M';
    } else if (absNum >= 1e3) {
        formatted = (num / 1e3).toFixed(1) + 'K';
    } else {
        formatted = num.toFixed(0);
    }

    return formatted.replace(/\.0(?=[A-Z])/, '');
}

export default function DamageOverTimeLineGraph({ chartData, start_ut }) {
    const dataLength = chartData[0]?.data?.length || 0;

    // データを加工
    const processedData = chartData.map(series => ({
        ...series,
        curve: "monotoneX",
        area: false,
        showMark: false,
        highlightScope: { highlighted: 'item', faded: 'global' },
    }));

    return (
        <Paper
            elevation={0}
            sx={{
                padding: "24px",
                height: "100%",
                borderRadius: '24px',
                // ★ダークモード背景
                backgroundColor: '#1C1C1E',
                boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* タイトル：白 */}
            <Typography variant="h6" sx={{ ...fontStyle, fontWeight: '700', color: '#FFFFFF', mb: 2 }}>
                ダメージ推移
            </Typography>

            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <LineChart
                    height={300}
                    series={processedData.length ? processedData : [{ data: [] }]}
                    xAxis={[
                        {
                            scaleType: 'point',
                            data: Array.from({ length: dataLength }).map(
                                (_, i) => new Date((start_ut * 1000) + (i * 1000)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
                            ),
                            disableTicks: true,
                            tickLabelStyle: {
                                ...fontStyle,
                                fontSize: 10,
                                fill: '#A1A1A6', // ★軸の文字色：明るいグレー
                            }
                        },
                    ]}
                    yAxis={[{
                        width: 40,
                        valueFormatter: formatLargeNumber,
                        tickLabelStyle: {
                            ...fontStyle,
                            fontSize: 10,
                            fill: '#A1A1A6', // ★軸の文字色：明るいグレー
                            fontWeight: '600'
                        }
                    }]}
                    grid={{ horizontal: true }}
                    margin={{ right: 20, left: 50, bottom: 30, top: 10 }}
                    slotProps={{
                        legend: {
                            hidden: true,
                        }
                    }}
                    sx={{
                        // ★グリッド線：薄い白に変更
                        '.MuiChartsGrid-line': {
                            stroke: 'rgba(255, 255, 255, 0.1)',
                            strokeWidth: 1,
                        }
                    }}
                />
            </Box>
        </Paper>
    );
}