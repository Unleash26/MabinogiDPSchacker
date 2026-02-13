using System;
using System.IO;
using System.Windows;

namespace OverlayApp
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Global exception handling
            AppDomain.CurrentDomain.UnhandledException += (s, args) =>
                LogException(args.ExceptionObject as Exception, "AppDomain.UnhandledException");

            DispatcherUnhandledException += (s, args) =>
            {
                LogException(args.Exception, "DispatcherUnhandledException");
                args.Handled = true;
            };

            // Log startup
            File.AppendAllText("overlay_debug.log", $"[{DateTime.Now}] App Started\n");
        }

        private void LogException(Exception? ex, string source)
        {
            if (ex == null) return;
            string log = $"[{DateTime.Now}] [ERROR] {source}: {ex.Message}\n{ex.StackTrace}\n\n";
            try
            {
                File.AppendAllText("overlay_error.log", log);
                MessageBox.Show($"Unexpected Error: {ex.Message}\nSee overlay_error.log for details.", "OverlayApp Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch { }
        }
    }
}
