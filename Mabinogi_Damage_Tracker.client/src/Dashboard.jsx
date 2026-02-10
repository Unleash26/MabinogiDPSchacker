import React, { useContext } from 'react';
import './App.css';
import AppTheme from './theme/AppTheme';
import { CssBaseline } from '@mui/material';
import { Box } from '@mui/system';
import SideMenu from './components/SideMenu';
import { AppContext } from './AppContext'; 
import MainContent from './components/MainContent';

function Dashboard() {
    // 自分で管理せず、全部 AppContext からもらう
    const { menu, mode } = useContext(AppContext);

    return (
        // ★重要: ここにあった <AppContext.Provider> を削除しました
        <AppTheme mode={mode}>
            <CssBaseline enableColorScheme />
            <Box sx={{ display: 'flex' }}>
                <SideMenu />
                <MainContent key={menu.name} menu={menu.name} props={menu.props} />
            </Box>
        </AppTheme>
    );
}

export default Dashboard;