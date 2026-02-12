import * as React from 'react';
import { useContext } from 'react'; // ★追加
import { AppContext } from '../AppContext'; // ★追加
import { PieChart } from '@mui/x-charts/PieChart';
import { useDrawingArea } from '@mui/x-charts/hooks';
import { useSeries } from '@mui/x-charts/hooks';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircleIcon from '@mui/icons-material/Circle';
import { styled } from '@mui/material/styles';

const fontStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif',
};

const settings = {
    margin: { right: 5 },
    width: 225,
    height: 225,
    hideLegend: false,
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

// 凡例（Legend）の修正
// 凡例（Legend）を外部コンポーネントとして分離
function ExternalLegend({ data, colors }) {
    if (!data || data.length === 0) {
        return null;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, marginLeft: "12px", maxHeight: 'none', overflowY: 'visible', pr: 1, minWidth: '140px' }}>
            {data.map((item, index) => (
                <Box
                    key={item.id}
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', marginRight: 2 }}>
                        <CircleIcon sx={{ color: colors[index % colors.length] ?? 'gray', fontSize: 10, marginRight: '8px' }} />
                        <Typography variant="body2" sx={{ ...fontStyle, fontWeight: 600, fontSize: '13px', color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                            {item.label}
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ ...fontStyle, fontWeight: 700, fontSize: '13px', color: '#A1A1A6' }}>
                        {formatLargeNumber(item.value)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

// 中央テキストのスタイル
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

export default function PlayerDamagePieChart({ chartData, height = '300px' }) {
    // ★AppContextから名簿を取得
    const { playerNames = {} } = useContext(AppContext);

    const totalDamage = (chartData || []).reduce((prev, curr) => prev + curr.value, 0);

    // ★データを変換！ (ID → 名前)
    const formattedData = (chartData || []).map((item, index) => ({
        ...item,
        id: index, // ユニークなIDを付与
        // ★ここでIDを名前に変換
        label: playerNames[item.label] || item.label,
        value: item.value,
    }));

    return (
        <Paper
            elevation={0}
            sx={{
                padding: "24px",
                height: "100%", // 親がstretchなら100%で合う。親がautoなら中身に合う。
                borderRadius: '24px',
                backgroundColor: '#1C1C1E',
                boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}
        >
            <Typography variant="h6" sx={{ ...fontStyle, fontWeight: '700', color: '#FFFFFF', mb: 1 }}>
                総合ダメージ
            </Typography>

            {/* コンテンツエリアのサイズを固定または指定サイズにする */}
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', height: height === '100%' ? 'auto' : height }}>
                <Box sx={{ flex: 1, height: '100%', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PieChart
                        series={[
                            {
                                data: formattedData,
                                innerRadius: 60, // サイズ調整
                                outerRadius: 80, // はみ出し防止のため縮小
                                paddingAngle: 2,
                                cornerRadius: 4,
                                highlightScope: { fade: 'global', highlight: 'item' },
                                faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
                            },
                        ]}
                        // 凡例コンポーネントをnullに置き換えて強制非表示
                        slots={{
                            legend: () => null,
                        }}
                        colors={customColors}
                        margin={{ right: 5 }}
                    >
                        {totalDamage > 0 ? <PieCenterLabel>{formatLargeNumber(totalDamage)}</PieCenterLabel> : <></>}
                    </PieChart>
                </Box>
                {/* 凡例を横に配置 */}
                <ExternalLegend data={formattedData} colors={customColors} />
            </Box>
        </Paper>
    );
}