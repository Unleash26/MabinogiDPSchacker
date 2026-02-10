import * as React from 'react';
import { useContext } from 'react';
import { AppContext } from '../AppContext';
import { BarChart } from '@mui/x-charts/BarChart';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const fontStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif',
};

// スキルごとに異なる色を割り当て
const skillColors = [
    "#8684BF", "#81B7C7", "#7ECFA1", "#9CD67A", "#DECC76",
    "#E67470", "#ED6BCD", "#A564F5", "#5D95FC", "#54FFE5",
    "#4AFF53", "#CFFF40", "#FF9036", "#FF2B72", "#E121FF",
    "#6B8E23", "#20B2AA", "#FF6347", "#4682B4", "#DA70D6"
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

/**
 * プレイヤーごとのスキル別ダメージを棒グラフで表示
 * 
 * Props:
 * - data: APIから取得したスキル別ダメージデータ
 *   [{playerId, playerName, skills: [{skillId, skillName, damage}]}]
 */
export default function SkillDamageBarChart({ data }) {
    const { playerNames = {} } = useContext(AppContext);

    // データがない場合の表示
    if (!data || data.length === 0) {
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
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <Typography variant="h6" sx={{ ...fontStyle, fontWeight: '700', color: '#FFFFFF', mb: 1 }}>
                    スキル別ダメージ
                </Typography>
                <Typography variant="body2" sx={{ ...fontStyle, color: '#A1A1A6' }}>
                    データがありません
                </Typography>
            </Paper>
        );
    }

    // すべてのスキル名を収集（凡例用）
    const allSkillsMap = new Map();
    data.forEach(player => {
        (player.skills || []).forEach(skill => {
            if (!allSkillsMap.has(skill.skillName)) {
                allSkillsMap.set(skill.skillName, allSkillsMap.size);
            }
        });
    });
    const allSkillNames = Array.from(allSkillsMap.keys());

    // X軸のラベル（プレイヤー名）
    const xAxisData = data.map(player => 
        playerNames[player.playerId] || player.playerName || `Player ${player.playerId}`
    );

    // スキルごとの系列データを作成
    const series = allSkillNames.map((skillName, index) => ({
        dataKey: skillName,
        label: skillName,
        stack: 'total',
        color: skillColors[index % skillColors.length],
    }));

    // データセット形式に変換（MUI X Chartsのフォーマット）
    const dataset = data.map(player => {
        const row = { 
            playerName: playerNames[player.playerId] || player.playerName || `Player ${player.playerId}` 
        };
        // 全スキルを0で初期化
        allSkillNames.forEach(skillName => {
            row[skillName] = 0;
        });
        // 実際のダメージ値を設定
        (player.skills || []).forEach(skill => {
            row[skill.skillName] = skill.damage;
        });
        return row;
    });

    // 総合ダメージを計算
    const totalDamage = data.reduce((sum, player) => {
        return sum + (player.skills || []).reduce((s, skill) => s + skill.damage, 0);
    }, 0);

    return (
        <Paper 
            elevation={0}
            sx={{ 
                padding: "24px", 
                height: "100%", 
                minHeight: 400,
                borderRadius: '24px', 
                backgroundColor: '#1C1C1E', 
                boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', 
                flexDirection: 'column',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ ...fontStyle, fontWeight: '700', color: '#FFFFFF' }}>
                    スキル別ダメージ
                </Typography>
                <Typography variant="body2" sx={{ ...fontStyle, fontWeight: '600', color: '#A1A1A6' }}>
                    Total: {formatLargeNumber(totalDamage)}
                </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, width: '100%', minHeight: 300 }}>
                <BarChart
                    dataset={dataset}
                    xAxis={[{ 
                        scaleType: 'band', 
                        dataKey: 'playerName',
                        tickLabelStyle: {
                            fontSize: 12,
                            fill: '#FFFFFF',
                        }
                    }]}
                    yAxis={[{
                        tickLabelStyle: {
                            fontSize: 11,
                            fill: '#A1A1A6',
                        },
                        valueFormatter: (value) => formatLargeNumber(value),
                    }]}
                    series={series}
                    slotProps={{
                        legend: {
                            direction: 'row',
                            position: { vertical: 'bottom', horizontal: 'middle' },
                            padding: { top: 20 },
                            labelStyle: {
                                fontSize: 11,
                                fill: '#FFFFFF',
                            },
                            itemMarkWidth: 10,
                            itemMarkHeight: 10,
                            markGap: 5,
                            itemGap: 15,
                        },
                    }}
                    height={300}
                    margin={{ left: 60, right: 20, top: 20, bottom: 80 }}
                    sx={{
                        '.MuiChartsAxis-line': { stroke: '#3A3A3C' },
                        '.MuiChartsAxis-tick': { stroke: '#3A3A3C' },
                    }}
                />
            </Box>
        </Paper>
    );
}
