import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

const fontStyle = { 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif' 
};

export default function PlayerCountCard({ count }) {
    return (
        <Paper 
            elevation={0}
            sx={{ 
                padding: "20px", 
                height: "100%", 
                borderRadius: '24px',
                backgroundColor: '#1C1C1E', // 漆黒で統一
                boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}
        >
            <Box>
                <Typography sx={{ ...fontStyle, color: '#A1A1A6', fontWeight: 600, fontSize: '17px', letterSpacing: '0.02em' }}>
                    参加人数
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 1 }}>
                    <Typography variant="h2" sx={{ ...fontStyle, fontWeight: 800, color: '#FFFFFF' }}>
                        {count}
                    </Typography>
                    <Typography sx={{ ...fontStyle, ml: 1, color: '#A1A1A6', fontWeight: 600 }}>
                        名
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
}