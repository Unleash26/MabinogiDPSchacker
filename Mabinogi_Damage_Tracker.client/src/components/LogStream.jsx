import React, { useEffect, useState, useRef, useContext } from 'react';
import { AppContext } from '../AppContext';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

export default function LogStream() {
    // ★安全装置1: コンテキスト自体が空でもエラーにしない
    const context = useContext(AppContext) || {};
    // ★安全装置2: playerNames がなければ空の辞書 {} を使う (これが重要！)
    const playerNames = context.playerNames || {};

    const [logs, setLogs] = useState([]);
    const containerRef = useRef(null);
    const [autoScroll, setAutoScroll] = useState(true);

    // ログを取得し続ける処理
    useEffect(() => {
        const eventSource = new EventSource(`http://${window.location.hostname}:5004/api/logs/stream`);

        eventSource.onmessage = (event) => {
            setLogs((prevLogs) => {
                const newLogs = [...prevLogs, event.data];
                // ログが増えすぎないように最新100件だけ残す
                if (newLogs.length > 100) {
                    return newLogs.slice(newLogs.length - 100);
                }
                return newLogs;
            });
        };

        eventSource.onerror = (err) => {
            // エラーが出ても静かに閉じる
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    // ログが更新されたら条件付きでスクロール
    // ユーザーが上にスクロールしている間は勝手に動かさない
    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const handleScroll = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            // 底から50px以内にいれば「追従モード」とみなす
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
            if (isAtBottom !== autoScroll) {
                setAutoScroll(isAtBottom);
            }
        }
    };

    // IDを名前に変換する関数
    const formatLogMessage = (message) => {
        if (!message) return "";
        let formatted = message;

        // ★安全装置3: playerNames が本当にデータを持っている時だけ実行する
        if (playerNames && Object.keys(playerNames).length > 0) {
            Object.keys(playerNames).forEach(id => {
                // IDが含まれていたら名前に置換
                if (message.includes(id)) {
                    formatted = formatted.split(id).join(playerNames[id]);
                }
            });
        }
        return formatted;
    };

    return (
        <Paper
            ref={containerRef}
            onScroll={handleScroll}
            elevation={0}
            sx={{
                height: '200px',
                overflowY: 'auto',
                backgroundColor: '#000000',
                border: '1px solid #333',
                p: 1,
                fontFamily: 'Consolas, monospace'
            }}
        >
            <Typography variant="subtitle2" sx={{ color: '#666', mb: 1, position: 'sticky', top: 0, bgcolor: '#000' }}>
                Event Logs (Real-time)
            </Typography>

            {logs.map((log, index) => (
                <Typography key={index} variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.2, color: '#00ff00' }}>
                    {/* 変換関数を通す */}
                    {formatLogMessage(log)}
                </Typography>
            ))}
        </Paper>
    );
}