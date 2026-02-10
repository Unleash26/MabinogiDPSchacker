import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { LineChart } from '@mui/x-charts/LineChart';

// デザイン共通設定
const fontStyle = { 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif' 
};

function formatLargeNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const absNum = Math.abs(num);
    let formatted;
    if (absNum >= 1e12) formatted = (num / 1e12).toFixed(1) + 'T';
    else if (absNum >= 1e9) formatted = (num / 1e9).toFixed(1) + 'B';
    else if (absNum >= 1e6) formatted = (num / 1e6).toFixed(1) + 'M';
    else if (absNum >= 1e3) formatted = (num / 1e3).toFixed(1) + 'K';
    else formatted = num.toFixed(0);
    return formatted.replace(/\.0(?=[A-Z])/, '');
}

export default function DamageCard({ totalDamage, chartData }) {
    return (
        <Paper 
            elevation={0}
            sx={{ 
                padding: "20px", 
                height: "100%", 
                borderRadius: '24px',
                backgroundColor: '#1C1C1E', // ダークモード統一
                boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Box>
                {/* アイコンを消してテキストのみに */}
                <Typography sx={{ ...fontStyle, color: '#A1A1A6', fontWeight: 600, fontSize: '17px', letterSpacing: '0.02em' }}>
                    総合ダメージ
                </Typography>
                <Typography variant="h3" sx={{ ...fontStyle, fontWeight: 800, color: '#FFFFFF', mt: 1 }}>
                    {formatLargeNumber(totalDamage)}
                </Typography>
            </Box>

            {/* 背後で薄く流れるミニグラフ（あれば） */}
            {chartData && (
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', opacity: 0.3, pointerEvents: 'none' }}>
                    <LineChart
                        series={[{ data: chartData, area: true, showMark: false, color: '#32D74B' }]}
                        xAxis={[{ scaleType: 'point', data: Array.from({ length: chartData.length }, (_, i) => i), hideTooltip: true }]}
                        leftAxis={null}
                        bottomAxis={null}
                        slotProps={{ legend: { hidden: true } }}
                        margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    />
                </Box>
            )}
        </Paper>
    );
}