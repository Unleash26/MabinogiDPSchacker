import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { dataDisplayCustomizations } from './customizations/dataDisplay';
import { surfacesCustomizations } from './customizations/surfaces';
import { getDesignTokens } from './themePrimitives';

export default function AppTheme(props) {
  const { children, disableCustomTheme, themeComponents, mode = 'dark' } = props;

  const theme = React.useMemo(() => {
    const tokens = getDesignTokens(mode);

    return createTheme({
  palette: {
  mode: 'dark',
  background: {
    default: '#0a0a0a',
    paper: '#1e1e1e',
  },
  text: {
    primary: '#e0e0e0',
    secondary: '#b0b0b0',
    disabled: '#777',
  },
  primary: {
    main: '#90caf9',
    contrastText: '#000',
  },
},
  typography: tokens.typography,
  shadows: tokens.shadows,
  shape: tokens.shape,
  components: {
        ...dataDisplayCustomizations,
        ...surfacesCustomizations,
        ...themeComponents,
        MuiPaper: { defaultProps: { variant: 'elevation' } },
        MuiMobileStepper: {
          defaultProps: { variant: 'dots' },
          styleOverrides: {
            dot: {
              backgroundColor: '#9e9e9e',
            },
            dotActive: {
              backgroundColor: tokens.palette.cardAccent.dark,
            },
          },
        },
        MuiGauge: {
          styleOverrides: {
            valueArc: {
              fill: tokens.palette.cardAccent.main,
            },
          },
        },
      },
    });
  }, [mode, themeComponents]);

  if (disableCustomTheme) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider theme={theme} disableTransitionOnChange>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
