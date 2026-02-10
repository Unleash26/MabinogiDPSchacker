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
function CustomLegend() {
    const series = useSeries();
    // ★ここで AppContext を使うのは少し難しいので、データ自体を変換済みにする戦略をとります
    if (!series.pie || !series.pie.seriesOrder || series.pie.seriesOrder.length === 0) {
        return null;
    }
    const firstSeriesId = series.pie.seriesOrder[0];
    const firstSeriesData = series.pie.series[firstSeriesId].data;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, marginLeft: "12px", maxHeight: '200px', overflowY: 'auto', pr: 1 }}>
            {firstSeriesData.map((item) => (
                <Box
                    key={item.id} // labelは被る可能性があるのでid推奨
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', marginRight: 2 }}>
                        <CircleIcon sx={{ color: item.color ?? 'gray', fontSize: 10, marginRight: '8px' }} />
                        {/* ここには変換済みの label が表示されます */}
                        <Typography variant="body2" sx={{ ...fontStyle, fontWeight: 600, fontSize: '13px', color: '#FFFFFF' }}>
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

export default function PlayerDamagePieChart({ chartData }) {
    // ★AppContextから名簿を取得
    const { playerNames = {} } = useContext(AppContext); // ここも = {} をつける

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
                height: "100%", 
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

            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PieChart
                    series={[
                        {
                            data: formattedData, // ★変換済みデータを渡す
                            innerRadius: 65,
                            outerRadius: 100,
                            paddingAngle: 2,
                            cornerRadius: 4,
                            highlightScope: { fade: 'global', highlight: 'item' },
                            faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
                        },
                    ]}
                    slots={{
                        legend: (props) => <CustomLegend {...props} />,
                    }}
                    colors={customColors}
                    {...settings}
                >
                    {totalDamage > 0 ? <PieCenterLabel>{formatLargeNumber(totalDamage)}</PieCenterLabel> : <></>}
                </PieChart>
            </Box>
        </Paper>
    );
}