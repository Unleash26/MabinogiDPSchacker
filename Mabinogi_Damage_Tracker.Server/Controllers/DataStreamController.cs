using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Threading.Channels;

// 名前空間がないとスキャン漏れの原因になることがあるため、念のため追加推奨
namespace Mabinogi_Damage_tracker.Controllers
{
    [ApiController]
    // ★修正：ここも "api/" を削除
    [Route("[controller]")]
    public class DataStreamController : ControllerBase
    {
        // 3つの独立したデータ通路（チャンネル）
        private static readonly Channel<object> _DamageStream = Channel.CreateUnbounded<object>(); 
        private static readonly Channel<object> _DoTstream = Channel.CreateUnbounded<object>(); 
        private static readonly Channel<object> _TotalDamagestream = Channel.CreateUnbounded<object>(); 

        // 書き込み用メソッド（ここは元のままでOK）
        public static void WriteDamageStream(object data)
        {
            _DamageStream.Writer.TryWrite(data);
        }
        public static void WriteDoTData(object data)
        {
            _DoTstream.Writer.TryWrite(data);
        }
        public static void WriteTotalDamageData(object data)
        {
            _TotalDamagestream.Writer.TryWrite(data); // ★ここでは _TotalDamagestream に書いている
        }

        // --- 以下、読み取り用API ---

        [HttpGet("DamagePacketStream")]
        public async Task DamagePacketStream()
        {
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Content-Type", "text/event-stream"); // ★修正: SSE用
            Response.Headers.Append("Connection", "keep-alive");
            Response.StatusCode = 200;

            var writer = Response.BodyWriter;
            await foreach (var logMessage in _DamageStream.Reader.ReadAllAsync())
            {
                var sseLine = $"data: {logMessage}\n\n";
                var bytes = Encoding.UTF8.GetBytes(sseLine);
                await writer.WriteAsync(bytes);
                await writer.FlushAsync();
                if (HttpContext.RequestAborted.IsCancellationRequested) break;
            }
        }

        [HttpGet("DamageOverTime")]
        public async Task StreamDoT()
        {
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Content-Type", "text/event-stream"); // ★修正: SSE用
            Response.Headers.Append("Connection", "keep-alive");
            Response.StatusCode = 200;

            var writer = Response.BodyWriter;
            
            // ★ここはDoT用なので _DoTstream を読む（正しい）
            await foreach (var logMessage in _DoTstream.Reader.ReadAllAsync())
            {
                var sseLine = $"data: {logMessage}\n\n";
                var bytes = Encoding.UTF8.GetBytes(sseLine);
                await writer.WriteAsync(bytes);
                await writer.FlushAsync();
                if (HttpContext.RequestAborted.IsCancellationRequested) break;
            }
        }

        [HttpGet("TotalDamage")]
        public async Task StreamTotalDamage()
        {
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Content-Type", "text/event-stream"); // ★修正: SSE用
            Response.Headers.Append("Connection", "keep-alive");
            Response.StatusCode = 200;

            var writer = Response.BodyWriter;

            // ★修正箇所: 元のコードはここで _DoTstream を読んでいました。
            // 書き込みメソッド(WriteTotalDamageData)に合わせて _TotalDamagestream に修正します。
            await foreach (var logMessage in _TotalDamagestream.Reader.ReadAllAsync())
            {
                var sseLine = $"data: {logMessage}\n\n";
                var bytes = Encoding.UTF8.GetBytes(sseLine);
                await writer.WriteAsync(bytes);
                await writer.FlushAsync();
                if (HttpContext.RequestAborted.IsCancellationRequested) break;
            }
        }
    }
}