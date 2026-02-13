using System;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace OverlayApp
{
    public partial class MainWindow : Window
    {
        private const string ConfigFile = "overlay_config.json";

        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
            Closing += MainWindow_Closing;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            LoadWindowConfig();
            try
            {
                // Environment creation
                var env = await CoreWebView2Environment.CreateAsync(null, null, new CoreWebView2EnvironmentOptions());
                await webView.EnsureCoreWebView2Async(env);

                // Set a dark background
                webView.DefaultBackgroundColor = System.Drawing.Color.FromArgb(255, 18, 18, 18); // #121212

                // Disable some browser features
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                // ** Zoom Factor ** - Requested 0.8 / 0.75
                webView.ZoomFactor = 0.75;

                // Navigate to the local server
                webView.CoreWebView2.Navigate("http://localhost:5004/");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"WebView2 initialization failed.\n{ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            SaveWindowConfig();
        }

        // --- Window Persistence Logic ---
        private void LoadWindowConfig()
        {
            try
            {
                if (System.IO.File.Exists(ConfigFile))
                {
                    string json = System.IO.File.ReadAllText(ConfigFile);
                    var config = System.Text.Json.JsonSerializer.Deserialize<WindowConfig>(json);
                    if (config != null)
                    {
                        // Validate coordinates
                        if (config.Width > 0 && config.Height > 0)
                        {
                            this.Left = config.Left;
                            this.Top = config.Top;
                            this.Width = Math.Max(400, config.Width);
                            this.Height = Math.Max(300, config.Height);
                        }
                    }
                }
            }
            catch { /* Ignore */ }
        }

        private void SaveWindowConfig()
        {
            try
            {
                if (WindowState == WindowState.Normal)
                {
                    WindowConfig config;
                    if (_isCompactMode)
                    {
                        // If closing in compact mode, save the normal size so we restart in normal mode
                        config = _normalConfig;
                    }
                    else
                    {
                        config = new WindowConfig
                        {
                            Left = this.Left,
                            Top = this.Top,
                            Width = this.Width,
                            Height = this.Height
                        };
                    }
                    
                    string json = System.Text.Json.JsonSerializer.Serialize(config);
                    System.IO.File.WriteAllText(ConfigFile, json);
                }
            }
            catch { /* Ignore */ }
        }

        public class WindowConfig
        {
            public double Left { get; set; }
            public double Top { get; set; }
            public double Width { get; set; }
            public double Height { get; set; }
            public bool IsCompact { get; set; }
        }

        private bool _isCompactMode = false;
        private WindowConfig _normalConfig = new WindowConfig(); // Cache for normal size

        // Window Control Event Handlers
        private void TitleBar_MouseLeftButtonDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            if (e.ClickCount == 2)
            {
                Maximize_Click(sender, e);
                return;
            }
            if (e.ButtonState == System.Windows.Input.MouseButtonState.Pressed)
            {
                DragMove();
            }
        }

        private void CompactMode_Click(object sender, RoutedEventArgs e)
        {
            if (!_isCompactMode)
            {
                // Enter Compact Mode
                _normalConfig = new WindowConfig
                {
                    Left = this.Left,
                    Top = this.Top,
                    Width = this.Width,
                    Height = this.Height
                };

                this.Width = 300;
                this.Height = 120;
                _isCompactMode = true;
                webView.CoreWebView2.Navigate("http://localhost:5004/compact");
            }
            else
            {
                // Exit Compact Mode
                if (_normalConfig.Width > 0)
                {
                    this.Left = _normalConfig.Left;
                    this.Top = _normalConfig.Top;
                    this.Width = _normalConfig.Width;
                    this.Height = _normalConfig.Height;
                }
                _isCompactMode = false;
                webView.CoreWebView2.Navigate("http://localhost:5004/");
            }
        }

        private void Minimize_Click(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Minimized;
        }

        private void Maximize_Click(object sender, RoutedEventArgs e)
        {
            if (_isCompactMode) return; // Disable maximize in compact mode? Or just let it happen but it breaks layout. Let's disable.

            if (WindowState == WindowState.Maximized)
                WindowState = WindowState.Normal;
            else
                WindowState = WindowState.Maximized;
        }

        private void Close_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
