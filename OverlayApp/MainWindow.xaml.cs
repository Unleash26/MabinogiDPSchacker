using System;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace OverlayApp
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
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

        private void Minimize_Click(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Minimized;
        }

        private void Maximize_Click(object sender, RoutedEventArgs e)
        {
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
