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

                // Set a dark background to match the app theme while loading
                webView.DefaultBackgroundColor = System.Drawing.Color.FromArgb(255, 18, 18, 18); // #121212

                // Disable some browser features for a refined app feel
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                // Navigate to the local server
                // We assume the server is running on port 5004 as started by Program.cs
                webView.CoreWebView2.Navigate("http://localhost:5004/");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"WebView2 initialization failed.\n{ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
