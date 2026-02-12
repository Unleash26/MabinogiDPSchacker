import * as React from 'react';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../AppContext';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import NumberField from './NumberField';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';

// デザイン共通設定（フォント）
const fontStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif'
};

export default function SettingsMenu() {
    const { pollingRate, setPollingRate } = useContext(AppContext);
    const { burstCount, setBurstCount } = useContext(AppContext);
    const { largestDamageInstanceCount, setLargestDamageInstantCount } = useContext(AppContext);
    const { excludedEnemyIds, toggleExclusion, enemyNameMap } = useContext(AppContext);

    const [adapters, setAdapters] = useState([]);
    const [selectedAdapter, setSelectedAdapter] = useState('');
    const [open, setOpen] = useState(false);
    const [severity, setSeverity] = useState("success");
    const [AlertMessage, setAlertMessage] = useState("");

    useEffect(() => {
        // Fetch adapter settings
        fetch(`http://${window.location.hostname}:5004/Home/GetCurrentAdapter`)
            .then(response => response.json())
            .then(data => {
                setSelectedAdapter(data);
            })
            .catch(error => console.error('Error:', error));

        fetch(`http://${window.location.hostname}:5004/Home/GetAllAdapters`)
            .then(response => response.json())
            .then(data => {
                setAdapters(data);
            })
            .catch(error => console.error('Error:', error));
    }, []);

    const handleAdapterChange = async (event) => {
        if (event.target.value === undefined) return;
        setSelectedAdapter(event.target.value);
        const response = await fetch(`http://${window.location.hostname}:5004/Home/SaveAdapter?adapter=${event.target.value}`);
        setOpen(true);
        if (response.ok) {
            setSeverity('success');
            setAlertMessage("Adapter Saved Successfully.");
        } else {
            setSeverity('error');
            setAlertMessage("Error Saving Adapter.");
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setOpen(false);
    };

    // 設定項目の共通スタイルコンポーネント（ダークモード対応）
    const SettingItem = ({ title, description, children }) => (
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
            <Box sx={{ maxWidth: '60%' }}>
                {/* タイトル：白 */}
                <Typography variant='h6' sx={{ ...fontStyle, fontWeight: '600', fontSize: '16px', color: '#FFFFFF' }}>
                    {title}
                </Typography>
                {/* 説明文：薄いグレー */}
                <Typography variant='body2' sx={{ ...fontStyle, color: '#A1A1A6', mt: 0.5, fontSize: '13px' }}>
                    {description}
                </Typography>
            </Box>
            <Box sx={{
                // 入力フィールド（NumberField等）の文字色を強制的に白にするハック
                '& .MuiInputBase-input': { color: '#FFFFFF' },
                '& .MuiInputLabel-root': { color: '#A1A1A6' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FFFFFF' },
                '& .MuiSvgIcon-root': { color: '#FFFFFF' }, // Selectの矢印アイコンなど
            }}>
                {children}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
            <Typography variant="h4" sx={{ ...fontStyle, fontWeight: '700', mb: 3, color: '#FFFFFF' }}>
                Settings
            </Typography>

            <Paper
                elevation={0}
                sx={{
                    padding: "32px",
                    borderRadius: '24px',
                    // ★ここをダークに変更
                    backgroundColor: '#1C1C1E', // Apple Dark Gray
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}
            >
                <SettingItem
                    title="Number of Burst"
                    description="Sets the number of unique damage burst to view in the analytics page."
                >
                    <NumberField min={1} max={16}
                        value={burstCount}
                        onValueChange={(value) => setBurstCount(value)}
                    />
                </SettingItem>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <SettingItem
                    title="Number of Largest Hits"
                    description="Sets the number of unique single largest damage instances to view."
                >
                    <NumberField min={1} max={16}
                        value={largestDamageInstanceCount}
                        onValueChange={(value) => setLargestDamageInstantCount(value)}
                    />
                </SettingItem>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <SettingItem
                    title="Polling Rate"
                    description="Sets the interval for receving data while recording."
                >
                    <NumberField min={10} max={10000} units="ms"
                        value={pollingRate}
                        onValueChange={(value) => setPollingRate(value)}
                    />
                </SettingItem>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <SettingItem
                    title="Select Adapter"
                    description="Sets the adapter for the parser to use."
                >
                    <FormControl sx={{ minWidth: 180 }} size="small">
                        <InputLabel id="adapter-InputLabel" sx={{ color: '#A1A1A6' }}>Adapter</InputLabel>
                        <Select
                            labelId="adapter-selector"
                            id="adapter-selector"
                            value={selectedAdapter}
                            onChange={handleAdapterChange}
                            label="Adapter"
                            sx={{
                                borderRadius: '12px',
                                color: '#FFFFFF',
                                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FFFFFF' },
                                '& .MuiSvgIcon-root': { color: '#FFFFFF' }
                            }}
                        >
                            {adapters.length ?
                                adapters.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)
                                :
                                (<MenuItem disabled>No Adapters Available</MenuItem>)
                            }
                        </Select>
                    </FormControl>
                </SettingItem>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <SettingItem
                    title="Target Filter"
                    description="Exclude specific targets from damage tracking."
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 200, overflowY: 'auto' }}>
                        {enemyNameMap.length > 0 ? (
                            enemyNameMap.map((enemy) => {
                                const isExcluded = excludedEnemyIds.includes(enemy.id);
                                return (
                                    <Box key={enemy.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Checkbox
                                            checked={isExcluded}
                                            onChange={() => toggleExclusion(enemy.id)}
                                            sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#0A84FF' } }}
                                        />
                                        <Typography sx={{ color: '#FFFFFF', fontSize: '14px' }}>
                                            {enemy.name} <span style={{ color: '#A1A1A6', fontSize: '12px' }}>(ID: {enemy.id}...)</span>
                                        </Typography>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography sx={{ color: '#A1A1A6', fontSize: '13px' }}>
                                No enemy definitions found in enemy_names.json
                            </Typography>
                        )}
                    </Box>
                </SettingItem>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <SettingItem
                    title="Restart Parse"
                    description="Restarts the parser service."
                >
                    <Button
                        color="error"
                        variant="outlined"
                        sx={{
                            borderRadius: '50px',
                            textTransform: 'none',
                            fontWeight: 'bold',
                            borderColor: '#FF453A', // iOS Red Dark Mode
                            color: '#FF453A',
                            '&:hover': {
                                borderColor: '#FF453A',
                                backgroundColor: 'rgba(255, 69, 58, 0.1)'
                            }
                        }}
                        onClick={async () => {
                            const response = await fetch(`http://${window.location.hostname}:5004/Home/RestartParser`)
                            setOpen(true);
                            if (response.ok) {
                                setSeverity('success');
                                setAlertMessage("Adapter Restarted Successfully.");
                            } else {
                                setSeverity('error');
                                setAlertMessage("Failed to restart adapter.");
                            }
                        }}
                    >
                        Restart Service
                    </Button>
                </SettingItem>
            </Paper>

            <Snackbar open={open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={severity}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: '12px' }}
                >
                    {AlertMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}