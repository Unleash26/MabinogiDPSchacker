import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

const fontStyle = { 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif' 
};

// 秒を「1h 20m 30s」形式に変換する関数
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const hDisplay = h > 0 ? `${h}時間 ` : "";
    const mDisplay = m > 0 ? `${m}分 ` : "";
    const sDisplay = s > 0 ? `${s}秒` : (h === 0 && m === 0 ? "0s" : "");
    return hDisplay + mDisplay + sDisplay;
}

export default function TimeCard({ length_ut }) {
    return (
        <Paper 
            elevation={0}
            sx={{ 
                padding: "20px", 
                height: "100%", 
                borderRadius: '24px',
                backgroundColor: '#1C1C1E', // 漆黒統一
                boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}
        >
            <Box>
                <Typography sx={{ ...fontStyle, color: '#A1A1A6', fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em' }}>
                    記録時間
                </Typography>
                <Typography variant="h3" sx={{ ...fontStyle, fontWeight: 800, color: '#FFFFFF', mt: 1 }}>
                    {formatDuration(length_ut)}
                </Typography>
            </Box>
        </Paper>
    );
}