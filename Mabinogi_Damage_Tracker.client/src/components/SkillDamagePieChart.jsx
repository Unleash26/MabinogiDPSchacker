import * as React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { useDrawingArea } from '@mui/x-charts/hooks';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircleIcon from '@mui/icons-material/Circle';
import { styled } from '@mui/material/styles';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';

const fontStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif',
};

const settings = {
    margin: { right: 5 },
    width: 225,
    height: 225,
    legend: { hidden: true },
};

const customColors = [
    "#8684BF", "#81B7C7", "#7ECFA1", "#9CD67A", "#DECC76",
    "#E67470", "#ED6BCD", "#A564F5", "#5D95FC", "#54FFE5",
    "#4AFF53", "#CFFF40", "#FF9036", "#FF2B72", "#E121FF"
];

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

function LegendItem({ item, totalValue }) {
    const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start', // space-between から flex-start に変更
                width: '100%',
                mb: 0.5 // 行間も少し詰める
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', marginRight: 2, minWidth: '120px' }}> {/* スキル名エリアに最小幅を持たせて揃える */}
                <CircleIcon sx={{ color: item.color ?? 'gray', fontSize: 10, marginRight: '8px', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ ...fontStyle, fontWeight: 600, fontSize: '13px', color: '#FFFFFF', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                </Typography>
            </Box>
            <Typography variant="body2" sx={{ ...fontStyle, fontWeight: 700, fontSize: '13px', color: '#A1A1A6', whiteSpace: 'nowrap' }}>
                {formatLargeNumber(item.value)} ({percentage}%)
            </Typography>
        </Box>
    );
}

const StyledText = styled('text')(({ theme }) => ({
    fill: theme.palette.text.primary,
    textAnchor: 'middle',
    dominantBaseline: 'central',
}));

function PieCenterLabel({ children }) {
    const { width, height, left, top } = useDrawingArea();
    return (
        <StyledText x={left + width / 2} y={top + height / 2}>
            <tspan dy="-6" fontSize="32px" fontWeight="800" fill="#FFFFFF" style={fontStyle}>{children}</tspan>
            <tspan x={left + width / 2} dy="24" fontSize="11px" fill="#A1A1A6" fontWeight="600" letterSpacing="0.05em" style={fontStyle}>TOTAL</tspan>
        </StyledText>
    );
}

export default function SkillDamagePieChart({ data, selectedPlayer, onPlayerChange, players }) {
    const [translations, setTranslations] = React.useState({});
    const [displayCount, setDisplayCount] = React.useState(20); // 表示数の状態管理

    // 翻訳ファイルを読み込み
    React.useEffect(() => {
        fetch('/skill_names_ja.json')
            .then(res => res.json())
            .then(json => {
                if (json.skillNameTranslations) {
                    setTranslations(json.skillNameTranslations);
                }
            })
            .catch(err => console.error('Failed to load skill translations:', err));
    }, []);

    const translateSkillName = (skillName) => {
        if (!skillName) return "Unknown";
        // 1. Try direct match
        if (translations[skillName]) return translations[skillName];
        // 2. Try matching with Unknown_Skill_ prefix (for numeric IDs)
        const unknownSkillKey = `Unknown_Skill_${skillName}`;
        if (translations[unknownSkillKey]) return translations[unknownSkillKey];
        // 3. Fallback
        return skillName;
    };

    const totalDamage = data ? data.reduce((prev, curr) => prev + curr.damage, 0) : 0;

    const sortedData = (data || []).sort((a, b) => b.damage - a.damage);
    const visibleData = displayCount === 'All' ? sortedData : sortedData.slice(0, displayCount);

    const chartData = visibleData.map((item, index) => ({
        id: index,
        label: translateSkillName(item.skillName),
        value: item.damage,
        color: customColors[index % customColors.length]
    }));

    return (
        <Paper
            elevation={0}
            sx={{
                padding: "24px",
                padding: "24px",
                // height: "100%", // 固定高さを削除して可変にする
                minHeight: "300px", // 最小高さは確保
                borderRadius: '24px',
                backgroundColor: '#1C1C1E',
                boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header: Title and Dropdown */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" sx={{ ...fontStyle, fontWeight: '700', color: '#FFFFFF' }}>
                    スキル別ダメージ
                </Typography>

                {onPlayerChange && (
                    <FormControl size="small">
                        <Select
                            value={selectedPlayer}
                            onChange={(e) => onPlayerChange(e.target.value)}
                            sx={{
                                ...fontStyle,
                                color: '#FFFFFF',
                                backgroundColor: '#2C2C2E',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                height: '32px',
                                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5D95FC' },
                                '.MuiSvgIcon-root': { color: '#A1A1A6' },
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        backgroundColor: '#2C2C2E',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        mt: 0.5,
                                    },
                                },
                            }}
                        >
                            <MenuItem value="__all__" sx={{ ...fontStyle, color: '#FFFFFF', fontSize: '12px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                                全員
                            </MenuItem>
                            {players && players.map(p => (
                                <MenuItem key={p.id} value={p.id} sx={{ ...fontStyle, color: '#FFFFFF', fontSize: '12px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                                    {p.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* 表示数切り替えセレクター */}
                <FormControl size="small" sx={{ ml: 1 }}>
                    <Select
                        value={displayCount}
                        onChange={(e) => setDisplayCount(e.target.value)}
                        sx={{
                            ...fontStyle,
                            color: '#FFFFFF',
                            backgroundColor: '#2C2C2E',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            height: '32px',
                            '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5D95FC' },
                            '.MuiSvgIcon-root': { color: '#A1A1A6' },
                        }}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    backgroundColor: '#2C2C2E',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    mt: 0.5,
                                },
                            },
                        }}
                    >
                        <MenuItem value={10} sx={{ ...fontStyle, color: '#FFFFFF', fontSize: '12px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>Top 10</MenuItem>
                        <MenuItem value={20} sx={{ ...fontStyle, color: '#FFFFFF', fontSize: '12px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>Top 20</MenuItem>
                        <MenuItem value={40} sx={{ ...fontStyle, color: '#FFFFFF', fontSize: '12px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>Top 40</MenuItem>
                        <MenuItem value="All" sx={{ ...fontStyle, color: '#FFFFFF', fontSize: '12px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>All</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {(!data || data.length === 0) ? (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{ ...fontStyle, color: '#A1A1A6' }}>
                        データがありません
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>
                    {/* Chart Area - Left (Sticky to stay visible when list is long) */}
                    <Box sx={{ width: 210, height: 210, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: 'sticky', top: 0 }}>
                        <PieChart
                            series={[
                                {
                                    data: chartData,
                                    innerRadius: 60,
                                    outerRadius: 95,
                                    paddingAngle: 2,
                                    cornerRadius: 4,
                                    highlightScope: { fade: 'global', highlight: 'item' },
                                    faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
                                    arcLabel: null, // ラベルが出ないように明示
                                },
                            ]}
                            colors={customColors}
                            margin={{ right: 0, left: 0, top: 0, bottom: 0 }}
                            slots={{ legend: () => null }} // デフォルト凡例を強制的に消す
                            width={210}
                            height={210}
                        >
                            {totalDamage > 0 ? <PieCenterLabel>{formatLargeNumber(totalDamage)}</PieCenterLabel> : <></>}
                        </PieChart>
                    </Box>

                    {/* Custom Legend - Right (Expandable) */}
                    <Box sx={{ ml: 4, flexGrow: 1, pr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                        {chartData.map((item) => (
                            <LegendItem key={item.id} item={item} totalValue={totalDamage} />
                        ))}
                    </Box>
                </Box>
            )}
        </Paper>
    );
}
