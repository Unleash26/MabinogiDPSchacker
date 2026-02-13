import * as React from 'react';
import { styled } from '@mui/material/styles';
import MuiDrawer, { drawerClasses } from '@mui/material/Drawer';
import Box from '@mui/material/Box';
// Dividerはもう使わないので削除してもOK
import MenuContent from './MenuContent';
// Typographyも削除

const drawerWidth = 240;

const Drawer = styled(MuiDrawer)({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: 'border-box',
  mt: 10,
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: 'border-box',
    borderRight: 'none', // ついでに右の線を消して、背景と一体化させる（iOS風）
    backgroundColor: '#1d1d1d', // 背景色をメイン画面と合わせる
  },
});

export default function SideMenu() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        [`& .${drawerClasses.paper}`]: {
          backgroundColor: '#0c0c0c', // 背景色統一
        },
      }}
    >
      {/* ★削除しました★
         画像を囲っていた Box と Divider を消去
      */}

      <Box
        sx={{
          overflow: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '40px', // ロゴが消えた分、少し上に余白を開ける
        }}
      >
        <MenuContent />
      </Box>
    </Drawer>
  );
}