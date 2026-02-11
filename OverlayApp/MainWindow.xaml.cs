using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;

namespace OverlayApp
{
    public partial class MainWindow : Window
    {
        private bool _isClickThrough = false;
        private bool _suppressComboBoxEvent = false;

        // Win32 constants
        private const int GWL_EXSTYLE = -20;
        private const int WS_EX_TRANSPARENT = 0x00000020;
        private const int WS_EX_LAYERED = 0x00080000;

        // Global hotkey
        private const int HOTKEY_ID = 9000;
        private const int MOD_CONTROL = 0x0002;
        private const int MOD_SHIFT = 0x0004;
        private const int WM_HOTKEY = 0x0312;

        [DllImport("user32.dll")]
        private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        [DllImport("user32.dll")]
        private static extern bool RegisterHotKey(IntPtr hWnd, int id, int fsModifiers, int vk);

        [DllImport("user32.dll")]
        private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        private IntPtr _hwnd;

        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
            Closed += MainWindow_Closed;

            // Initialize ComboBox with default item
            PlayerComboBox.Items.Add(CreateStyledItem("全員", "__all__"));
            PlayerComboBox.SelectedIndex = 0;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            _hwnd = new WindowInteropHelper(this).Handle;

            // Register global hotkey: Ctrl+Shift+L
            RegisterHotKey(_hwnd, HOTKEY_ID, MOD_CONTROL | MOD_SHIFT, 0x4C /* L */);

            // Hook into window messages for hotkey
            var source = HwndSource.FromHwnd(_hwnd);
            source?.AddHook(WndProc);

            try
            {
                var env = await CoreWebView2Environment.CreateAsync(null, null,
                    new CoreWebView2EnvironmentOptions());
                await webView.EnsureCoreWebView2Async(env);

                webView.DefaultBackgroundColor = System.Drawing.Color.Transparent;

                // Listen for messages from JavaScript
                webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

                webView.CoreWebView2.Navigate($"http://localhost:5004/overlay.html?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"WebView2の初期化に失敗しました。\n\n{ex.Message}\n\nWebView2 Runtimeがインストールされていることを確認してください。",
                    "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                Close();
            }
        }

        private ComboBoxItem CreateStyledItem(string content, string tag)
        {
            var item = new ComboBoxItem
            {
                Content = content,
                Tag = tag,
                Foreground = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#e0e0e0")),
                Background = System.Windows.Media.Brushes.Transparent,
                Padding = new Thickness(6, 3, 6, 3),
                FontSize = 10,
            };
            // Hover style
            item.MouseEnter += (s, ev) => item.Background = new System.Windows.Media.SolidColorBrush(
                (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#33ffffff"));
            item.MouseLeave += (s, ev) => item.Background = System.Windows.Media.Brushes.Transparent;
            return item;
        }

        private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var message = e.WebMessageAsJson;
                using var doc = JsonDocument.Parse(message);
                var root = doc.RootElement;

                if (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "playerList")
                {
                    var players = root.GetProperty("players");
                    Dispatcher.Invoke(() =>
                    {
                        _suppressComboBoxEvent = true;
                        var prevTag = (PlayerComboBox.SelectedItem as ComboBoxItem)?.Tag?.ToString() ?? "__all__";

                        PlayerComboBox.Items.Clear();
                        PlayerComboBox.Items.Add(CreateStyledItem("全員", "__all__"));

                        int selectIndex = 0;
                        int idx = 1;
                        foreach (var player in players.EnumerateArray())
                        {
                            var pid = player.GetProperty("id").GetString() ?? "";
                            var name = player.GetProperty("name").GetString() ?? pid;
                            PlayerComboBox.Items.Add(CreateStyledItem(name, pid));
                            if (pid == prevTag) selectIndex = idx;
                            idx++;
                        }

                        PlayerComboBox.SelectedIndex = selectIndex;
                        _suppressComboBoxEvent = false;
                    });
                }
            }
            catch { }
        }

        private async void PlayerComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_suppressComboBoxEvent) return;
            if (PlayerComboBox.SelectedItem is ComboBoxItem item)
            {
                var value = item.Tag?.ToString() ?? "__all__";
                try
                {
                    if (webView.CoreWebView2 != null)
                    {
                        var escaped = value.Replace("'", "\\'");
                        await webView.CoreWebView2.ExecuteScriptAsync(
                            $"if(typeof setOverlayPlayer==='function')setOverlayPlayer('{escaped}');");
                    }
                }
                catch { }
            }
        }

        private void MainWindow_Closed(object? sender, EventArgs e)
        {
            UnregisterHotKey(_hwnd, HOTKEY_ID);
        }

        private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            if (msg == WM_HOTKEY && wParam.ToInt32() == HOTKEY_ID)
            {
                ToggleClickThrough();
                handled = true;
            }
            return IntPtr.Zero;
        }

        private void ToggleClickThrough()
        {
            _isClickThrough = !_isClickThrough;

            int extStyle = GetWindowLong(_hwnd, GWL_EXSTYLE);

            if (_isClickThrough)
            {
                SetWindowLong(_hwnd, GWL_EXSTYLE, extStyle | WS_EX_TRANSPARENT | WS_EX_LAYERED);
                Dispatcher.Invoke(() =>
                {
                    LockButton.Content = "🔒";
                    HotkeyHint.Text = "Ctrl+Shift+L: 解除";
                });
            }
            else
            {
                SetWindowLong(_hwnd, GWL_EXSTYLE, extStyle & ~WS_EX_TRANSPARENT);
                Dispatcher.Invoke(() =>
                {
                    LockButton.Content = "🔓";
                    HotkeyHint.Text = "Ctrl+Shift+L: ロック";
                });
            }
        }

        private void DragBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (!_isClickThrough)
            {
                DragMove();
            }
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }

        private void LockButton_Click(object sender, RoutedEventArgs e)
        {
            ToggleClickThrough();
        }

        private void ResizeGrip_DragDelta(object sender, DragDeltaEventArgs e)
        {
            double newWidth = Width + e.HorizontalChange;
            double newHeight = Height + e.VerticalChange;

            if (newWidth >= 280) Width = newWidth;
            if (newHeight >= 300) Height = newHeight;
        }
    }
}
