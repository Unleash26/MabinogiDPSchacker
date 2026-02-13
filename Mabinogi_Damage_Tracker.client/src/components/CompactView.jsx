import { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../AppContext';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

export default function CompactView() {
    const { pollingRate = 1000 } = useContext(AppContext) || {};
    const [totalDamage, setTotalDamage] = useState(0);
    const [dps, setDps] = useState(0);
    const [recording, setRecording] = useState(true); // Auto-start monitoring visualization
    const lastFetchedIdRef = useRef(0);
    const lastTotalDamageRef = useRef(0);
    const startTimeRef = useRef(Date.now());

    // Minimal Fetch Logic
    useEffect(() => {
        const poll = async () => {
            try {
                const response = await fetch(`http://${window.location.hostname}:5004/Home/GetRawDamagesAfterId?lastFetchedId=${lastFetchedIdRef.current}`);
                const data = await response.json();

                if (data && Array.isArray(data) && data.length > 0) {
                    lastFetchedIdRef.current = data[data.length - 1].id;
                    const newDamage = data.reduce((sum, item) => sum + item.damage, 0);

                    setTotalDamage(prev => {
                        const nextDetails = prev + newDamage;
                        return nextDetails;
                    });
                }
            } catch (error) {
                // Silent fail
            }
        };

        const interval = setInterval(poll, pollingRate);
        return () => clearInterval(interval);
    }, [pollingRate]);

    // Simple DPS calculation based on elapsed time since component mount (or session start)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsedSeconds = (now - startTimeRef.current) / 1000;
            if (elapsedSeconds > 0) {
                setDps(totalDamage / elapsedSeconds);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [totalDamage]);

    // Format numbers (e.g. 1.2M, 300K)
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.floor(num).toString();
    };

    return (
        <Box sx={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'transparent',
            padding: 1,
            boxSizing: 'border-box'
        }}>
            <Paper sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'center',
                backgroundColor: 'rgba(28, 28, 30, 0.9)', // Slightly opaque
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0 16px'
            }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#8e8e93', fontWeight: 'bold' }}>DPS</Typography>
                    <Typography variant="h4" sx={{ color: '#32D74B', fontWeight: '900', lineHeight: 1 }}>
                        {formatNumber(dps)}
                    </Typography>
                </Box>

                <Box sx={{ width: '1px', height: '60%', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#8e8e93', fontWeight: 'bold' }}>TOTAL</Typography>
                    <Typography variant="h4" sx={{ color: '#0A84FF', fontWeight: '900', lineHeight: 1 }}>
                        {formatNumber(totalDamage)}
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
}
