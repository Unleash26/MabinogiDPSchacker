import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

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

export default function HealingCard({ totalHealing }) {
    return (
        <Paper 
            elevation={0}
            sx={{ 
                padding: "20px", 
                height: "100%", 
                borderRadius: '24px',
                backgroundColor: '#1C1C1E',
                boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}
        >
            <Box>
                <Typography sx={{ ...fontStyle, color: '#A1A1A6', fontWeight: 600, fontSize: '17px', letterSpacing: '0.02em' }}>
                    合計回復量
                </Typography>
                <Typography variant="h2" sx={{ ...fontStyle, fontWeight: 800, color: '#ff4466', mt: 1 }}>
                    {formatLargeNumber(totalHealing)}
                </Typography>
            </Box>
        </Paper>
    );
}