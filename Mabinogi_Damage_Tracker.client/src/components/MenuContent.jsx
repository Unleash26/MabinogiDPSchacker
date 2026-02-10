import * as React from 'react';
import { useContext } from 'react';
import { AppContext } from '../AppContext';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import HistoryIcon from '@mui/icons-material/History';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import PersonIcon from '@mui/icons-material/Person';

// ★メインメニューの定義
// text: 裏側のプログラム用（英語のまま触らない）
// label: 画面に表示する用（日本語にする）
const mainListItems = [
    // Homeは削除しました
    { text: 'Live', label: '計測', icon: <RssFeedIcon />},
    { text: 'Players', label: 'プレイヤー', icon: <PersonIcon />},
    { text: 'Recordings', label: '過去ログ', icon: <HistoryIcon /> },
];

// ★サブメニューの定義
const secondaryListItems = [
    { text: 'Settings', label: '設定', icon: <SettingsRoundedIcon /> },
    // About (アプリについて) は削除しました
    // Feedback (意見を送る) は削除しました
];

export default function MenuContent() {
    const { menu, setMenu } = useContext(AppContext) 

    return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
        <List dense>
        {mainListItems.map((item, index) => (
            <ListItem key={index} disablePadding sx={{ display: 'block' }}>
            {/* selected判定には英語の item.text を使う */}
            <ListItemButton selected={item.text === menu.name} onClick={() => {
                // クリック時も英語の item.text を渡す（これで壊れない）
                setMenu({ name: item.text })
                }}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                {/* 表示には日本語の item.label を使う */}
                <ListItemText primary={item.label} />
            </ListItemButton>
            </ListItem>
        ))}
        </List>
        
        <List dense>
        {secondaryListItems.map((item, index) => (
            <ListItem key={index} disablePadding sx={{ display: 'block' }} >
                <ListItemButton selected={item.text === menu.name} onClick={() => {
                     setMenu({ name: item.text })
                    }}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                </ListItemButton>
            </ListItem>
        ))}
        </List>
    </Stack>
    );
}