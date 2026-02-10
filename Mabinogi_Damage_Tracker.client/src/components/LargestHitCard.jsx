import * as React from 'react';
import { useContext } from 'react'; // ★追加
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { AppContext } from '../AppContext'; // ★追加: データをここから受け取る

// デザイン共通設定
const fontStyle = { 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif' 
};

// 数字を短縮表示する関数（1.3Mなど）
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

export default function LargestHitCard({ largestDamageInstances }) {
    // ★追加: AppContextから「全プレイヤー名簿」をもらう
    const { playerNames = {} } = useContext(AppContext); // = {} をつけて、空でも死なないようにする

    // データがない場合のガード
    if (!largestDamageInstances || largestDamageInstances.length === 0) {
        return null;
    }

    // 1位のデータ（一番デカいやつ）
    const topHit = largestDamageInstances[0];

    // ★追加: 名簿の中にIDがあれば「名前」に、なければ「IDのまま」にする魔法
    // topHit.player_name には元々 ID が入っている
    const displayName = playerNames[topHit.player_name] || topHit.player_name;

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
                <Typography sx={{ ...fontStyle, color: '#A1A1A6', fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em' }}>
                    一番強いダメージ出したかっこいいやつ
                </Typography>
                
                <Typography sx={{ ...fontStyle, fontWeight: 800, color: '#FF9500', mt: 1, fontSize: '50px'}}>
                    {formatLargeNumber(topHit.damage)}
                </Typography>
                
                <Typography sx={{ ...fontStyle, color: '#FFFFFF', fontWeight: 600, mt: 0.5, fontSize: '16px' }}>
                    {/* ★変換済みの名前を表示 */}
                    → {displayName}
                </Typography>
            </Box>
        </Paper>
    );
}