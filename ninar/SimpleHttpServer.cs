using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;

public class SimpleHttpServer {
    public static void Main(string[] args) {
        int port = args.Length > 0 ? int.Parse(args[0]) : 8080;
        string rootDir = args.Length > 1 ? args[1] : Directory.GetCurrentDirectory();
        
        HttpListener listener = new HttpListener();
        listener.Prefixes.Add("http://localhost:" + port + "/");
        listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
        
        try {
            listener.Start();
        } catch (Exception ex) {
            Console.WriteLine("Erro ao iniciar servidor na porta " + port + ": " + ex.Message);
            // Tenta porta alternativa
            port = 8888;
            listener = new HttpListener();
            listener.Prefixes.Add("http://localhost:" + port + "/");
            listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
            listener.Start();
        }

        Console.WriteLine("====================================================");
        Console.WriteLine(" SERVIDOR LOCAL ATIVO COM SUCESSO!");
        Console.WriteLine(" Acesse no navegador:");
        Console.WriteLine(" http://localhost:" + port + "/FEFO_Player_Relaxante.html");
        Console.WriteLine(" http://localhost:" + port + "/");
        Console.WriteLine(" Diretório base: " + rootDir);
        Console.WriteLine("====================================================");

        while (listener.IsListening) {
            try {
                HttpListenerContext ctx = listener.GetContext();
                Task.Run(() => ProcessRequest(ctx, rootDir, port));
            } catch (Exception) {
                break;
            }
        }
    }

    static void ProcessRequest(HttpListenerContext ctx, string rootDir, int port) {
        try {
            string rawUrl = ctx.Request.Url.AbsolutePath;
            string decodedUrl = Uri.UnescapeDataString(rawUrl);

            if (decodedUrl == "/" || string.IsNullOrEmpty(decodedUrl)) {
                decodedUrl = "/FEFO_Player_Relaxante.html";
            }

            string relativePath = decodedUrl.TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar);
            string fullPath = Path.Combine(rootDir, relativePath);

            if (!File.Exists(fullPath)) {
                ctx.Response.StatusCode = 404;
                byte[] notFound = Encoding.UTF8.GetBytes("Arquivo nao encontrado: " + decodedUrl);
                ctx.Response.OutputStream.Write(notFound, 0, notFound.Length);
                ctx.Response.Close();
                return;
            }

            string ext = Path.GetExtension(fullPath).ToLower();
            string mime = "application/octet-stream";
            if (ext == ".html" || ext == ".htm") mime = "text/html; charset=utf-8";
            else if (ext == ".css") mime = "text/css; charset=utf-8";
            else if (ext == ".js") mime = "application/javascript; charset=utf-8";
            else if (ext == ".wav") mime = "audio/wav";
            else if (ext == ".mp3") mime = "audio/mpeg";
            else if (ext == ".png") mime = "image/png";
            else if (ext == ".jpg" || ext == ".jpeg") mime = "image/jpeg";
            else if (ext == ".svg") mime = "image/svg+xml";

            ctx.Response.ContentType = mime;
            ctx.Response.AddHeader("Accept-Ranges", "bytes");

            // Suporte a Audio Range requests (Seeking e streaming de áudio perfeito)
            FileInfo fi = new FileInfo(fullPath);
            long fileLength = fi.Length;
            string rangeHeader = ctx.Request.Headers["Range"];

            if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes=")) {
                string[] parts = rangeHeader.Substring(6).Split('-');
                long start = long.Parse(parts[0]);
                long end = parts.Length > 1 && !string.IsNullOrEmpty(parts[1]) ? long.Parse(parts[1]) : fileLength - 1;
                long count = end - start + 1;

                ctx.Response.StatusCode = 206; // Partial Content
                ctx.Response.AddHeader("Content-Range", string.Format("bytes {0}-{1}/{2}", start, end, fileLength));
                ctx.Response.ContentLength64 = count;

                using (FileStream fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                    fs.Seek(start, SeekOrigin.Begin);
                    byte[] buffer = new byte[64 * 1024];
                    long bytesLeft = count;
                    while (bytesLeft > 0) {
                        int toRead = (int)Math.Min(buffer.Length, bytesLeft);
                        int read = fs.Read(buffer, 0, toRead);
                        if (read <= 0) break;
                        ctx.Response.OutputStream.Write(buffer, 0, read);
                        bytesLeft -= read;
                    }
                }
            } else {
                ctx.Response.StatusCode = 200;
                ctx.Response.ContentLength64 = fileLength;
                using (FileStream fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = fs.Read(buffer, 0, buffer.Length)) > 0) {
                        ctx.Response.OutputStream.Write(buffer, 0, read);
                    }
                }
            }

            ctx.Response.Close();
        } catch (Exception) {
            try { ctx.Response.Close(); } catch { }
        }
    }
}
