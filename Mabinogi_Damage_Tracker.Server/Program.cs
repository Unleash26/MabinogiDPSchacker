using System.Diagnostics;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.StaticFiles;
using Mabinogi_Damage_tracker;

var builder = WebApplication.CreateBuilder(args);

// --- DB/Parser初期化 ---
db_helper.Initalize_db();
Parser.Start();

// --- サービス登録 ---
builder.Services.AddControllersWithViews(); // APIとMVC両方対応
builder.Services.AddCors(options => {
    options.AddPolicy("AllowReactApp", policy => {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();



// --- 1. 時限判定 ---
var expireDate = new DateTime(2027, 2, 14, 0, 0, 0);
if (DateTime.Now > expireDate)
{
    Console.WriteLine("期限切れです。");
    Thread.Sleep(3000);
    Environment.Exit(0);
}

// --- 2. 静的ファイルの絶対パス解決 ---
var baseDir = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule?.FileName) ?? AppContext.BaseDirectory;
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
    try { Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true }); }
    catch { }
});

app.Run(url);