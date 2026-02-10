import { useState, useEffect } from 'react'
import { Paper, Typography, Box, Stack } from '@mui/material'
import {
    GaugeContainer,
    GaugeValueArc,
    GaugeReferenceArc,
    useGaugeState,
} from '@mui/x-charts/Gauge';

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

// デザイン共通設定
const fontStyle = { 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif' 
};

function CenterMetric({ value }) {
    const { cx, cy } = useGaugeState();
    
    return (
        <text x={cx} y={cy} textAnchor="middle">
            {/* メイン数値：白に変更 */}
            <tspan x={cx} dy="-15" fontSize="48px" fontWeight="800" fill="#FFFFFF" style={fontStyle}>
                {formatLargeNumber(value)}
            </tspan>
            {/* ラベル：薄いグレーに変更 */}
            <tspan x={cx} dy="35" fontSize="13px" fill="#A1A1A6" fontWeight="600" letterSpacing="0.05em" style={fontStyle}>
                CURRENT DPS
            </tspan>
        </text>
    );
}

export default function PlayerDamageGauge({ value = 0, averageDPS }) {
    const [valueMax, setValueMax] = useState(1);

    useEffect(() => {
        setValueMax(prev => {
            const current = value || 0;
            return Math.max(prev, current, 1);
        })
    }, [value])

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
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}
        >
            <Typography variant="h6" sx={{ ...fontStyle, fontWeight: '700', color: '#FFFFFF', mb: 1 }}>
                ダメージ効率
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, position: 'relative' }}>
                <GaugeContainer
                    width={260}
                    height={150} 
                    startAngle={-90} 
                    endAngle={90}    
                    value={value}
                    valueMax={valueMax}
                    margin={{ bottom: 0 }} 
                >
                    {/* ゲージの背景：暗いグレー */}
                    <GaugeReferenceArc sx={{ fill: '#2C2C2E' }} />
                    {/* ゲージの色：ダークモードで映える緑 (#32D74B) */}
                    <GaugeValueArc sx={{ fill: '#32D74B', rx: 4 }} /> 
                    <CenterMetric value={value} />
                </GaugeContainer>

                <Stack direction="row" spacing={4} sx={{ mt: 0, width: '100%', justifyContent: 'space-around', px: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                        {/* ラベル色変更 */}
                        <Typography sx={{ ...fontStyle, color: '#A1A1A6', fontWeight: 700, fontSize: '15px', letterSpacing: '0.02em', mb: 0.5 }}>
                            最高瞬間DPS
                        </Typography>
                        {/* 数値色変更（赤は少し明るく調整） */}
                        <Typography sx={{ ...fontStyle, fontWeight: 800, color: '#FF453A', fontSize: '30px', lineHeight: 1 }}> 
                            {formatLargeNumber(valueMax)}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center' }} />
                    
                    <Box sx={{ textAlign: 'center' }}>
                        {/* ラベル色変更 */}
                        <Typography sx={{ ...fontStyle, color: '#A1A1A6', fontWeight: 700, fontSize: '15px', letterSpacing: '0.02em', mb: 0.5 }}>
                            平均DPS
                        </Typography>
                        {/* 数値色変更（青は少し明るく調整） */}
                        <Typography sx={{ ...fontStyle, fontWeight: 800, color: '#0A84FF', fontSize: '30px', lineHeight: 1 }}>
                            {formatLargeNumber(averageDPS)}
                        </Typography>
                    </Box>
                </Stack>
            </Box>
        </Paper>
    );
}