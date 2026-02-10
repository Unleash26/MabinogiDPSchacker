import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

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

export default function BurstCard({ bands }) {
    // データがない場合のガード
    if (!bands || bands.length === 0) {
        return null;
    }

    // 1位のバーストデータ（一番高い数値）を表示
    const topBurst = bands[0];

    return (
        <Paper 
            elevation={0}
            sx={{ 
                padding: "20px", 
                height: "100%", 
                borderRadius: '24px',
                backgroundColor: '#1C1C1E', // 漆黒
                boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}
        >
            <Box>
                {/* 15s/30s/60sバースト という日本語表記に */}
                <Typography sx={{ ...fontStyle, color: '#A1A1A6', fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em' }}>
                    {topBurst.label}バースト
                </Typography>
                
                {/* 数値はiOSイエロー（#FFD60A）で強調 */}
                <Typography variant="h2" sx={{ ...fontStyle, fontWeight: 800, color: '#FFD60A', mt: 1 }}>
                    {formatLargeNumber(topBurst.damage)}
                </Typography>
                
                <Typography sx={{ ...fontStyle, color: '#FFFFFF', fontWeight: 600, mt: 0.5, fontSize: '16px' }}>
                    by {topBurst.player_name}
                </Typography>

                <Typography sx={{ ...fontStyle, color: '#8E8E93', mt: 0.5, fontSize: '12px' }}>
                    開始時刻: {topBurst.start}
                </Typography>
            </Box>
        </Paper>
    );
}