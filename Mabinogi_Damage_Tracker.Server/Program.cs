using System.Diagnostics;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.StaticFiles;
using Mabinogi_Damage_tracker;

var exePath = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule?.FileName) ?? AppContext.BaseDirectory;
var internalDir = Path.Combine(exePath, "_internal");
var useInternal = Directory.Exists(internalDir);
var baseDir = useInternal ? internalDir : exePath;

// --- DB/Parser初期化 ---
// _internalがある場合はそこにDBがあるとみなす
if (useInternal)
{
    // Change working directory so DLLs and relative file access work naturally
    Directory.SetCurrentDirectory(baseDir);
    db_helper.db_connection = $"Data Source={Path.Combine(baseDir, "trackerdb.db")};";
}
db_helper.Initalize_db();
Parser.Start();

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = baseDir,
    WebRootPath = Path.Combine(baseDir, "wwwroot") // Default, though we use static files manually below
});

// Load appsettings from the correct location
builder.Configuration.SetBasePath(baseDir);
builder.Configuration.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
builder.Configuration.AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true);

// --- サービス登録 ---
builder.Services.AddControllersWithViews(); // APIとMVC両方対応
builder.Services.AddCors(options => {
    options.AddPolicy("AllowReactApp", policy => {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();



// --- 1. 時限判定 ---
var expireDate = new DateTime(2026, 3, 30, 0, 0, 0);
if (DateTime.Now > expireDate)
{
    Console.WriteLine("期限切れです。");
    Thread.Sleep(3000);
    Environment.Exit(0);
}

// --- 2. 静的ファイルの絶対パス解決 ---
// baseDir is already set correctly above
var clientPath = Path.Combine(baseDir, "client");

// --- 3. MIMEタイプ設定 ---
var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".css"] = "text/css; charset=utf-8";
provider.Mappings[".js"] = "application/javascript; charset=utf-8";

if (Directory.Exists(clientPath))
{
    var fileProvider = new PhysicalFileProvider(clientPath);
    app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fileProvider,
        RequestPath = "",
        ContentTypeProvider = provider,
        OnPrepareResponse = ctx =>
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
            ctx.Context.Response.Headers.Append("Expires", "0");
        }
    });
}

// --- 4. ルーティング設定 ---
app.UseRouting();
app.UseCors("AllowReactApp");
app.UseAuthorization();

// 1. まずコントローラー（API）を探す
app.MapControllers();

// 2. コントローラーのルートが見つからない場合、従来のパターンも試す
app.MapControllerRoute(
    name: "default",
    pattern: "api/{controller}/{action=Index}/{id?}");

// 3. APIじゃなかったら、Reactの画面（index.html）を返す
// ★これが悪さをしてAPIリクエストにHTMLを返していたので、APIの後ろに置くのが鉄則
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(clientPath)
});
// --- 6. 起動 ---
var url = "http://localhost:5004";
Task.Run(() =>
{
    Thread.Sleep(1000);
    try 
    { 
        // OverlayApp.exe is expected to be alongside the Server executable (exePath), 
        // regardless of whether we are using _internal for other assets.
        var overlayPath = Path.Combine(exePath, "OverlayApp.exe");
        if (File.Exists(overlayPath))
        {
            Console.WriteLine($"Launching OverlayApp: {overlayPath}");
            Process.Start(new ProcessStartInfo { FileName = overlayPath, UseShellExecute = true });
        }
        else
        {
            Console.WriteLine("OverlayApp not found, launching browser...");
            Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true }); 
        }
    }
    catch { }
});

app.Run(url);