using System.Globalization;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using PetOwner.Data;
using PetOwner.Data.Models;
using QRCoder;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace PetOwner.Api.Services;

/// <summary>
/// Renders a branded PNG "digital share card" (name, service, rating, photo, QR to public web URL).
/// </summary>
public interface IProviderShareCardService
{
    Task<byte[]?> TryGeneratePngAsync(Guid providerId, CancellationToken ct = default);
}

public sealed class ProviderShareCardService : IProviderShareCardService
{
    private const int W = 1080;
    private const int H = 1400;
    private const int Pad = 48;

    private readonly ApplicationDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ProviderShareCardService> _logger;

    private static readonly Color BgNavy = Color.ParseHex("001A5A");
    private static readonly Color Ink = Color.ParseHex("001A5A");
    private static readonly Color Muted = Color.ParseHex("64748B");
    private static readonly Color Accent = Color.ParseHex("0EA5E9");

    public ProviderShareCardService(
        ApplicationDbContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        IWebHostEnvironment env,
        ILogger<ProviderShareCardService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _env = env;
        _logger = logger;
    }

    public async Task<byte[]?> TryGeneratePngAsync(Guid providerId, CancellationToken ct = default)
    {
        var row = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == providerId)
            .Where(u => u.ProviderProfile != null && u.ProviderProfile.Status == ProviderStatus.Approved)
            .Select(u => new
            {
                u.Name,
                u.ProviderProfile!.ProfileImageUrl,
                u.ProviderProfile.AverageRating,
                u.ProviderProfile.ReviewCount,
                PrimaryServiceName = u.ProviderProfile.ProviderServices
                    .OrderBy(ps => ps.ServiceId)
                    .Select(ps => ps.Service.Name)
                    .FirstOrDefault(),
            })
            .FirstOrDefaultAsync(ct);

        if (row is null) return null;

        var publicUrl = BuildPublicWebUrl(providerId);
        var qrPng = BuildQrPngBytes(publicUrl);
        if (qrPng is null) return null;

        var fontPath = System.IO.Path.Combine(_env.ContentRootPath, "Resources", "Fonts", "RobotoMono-Bold.ttf");
        if (!System.IO.File.Exists(fontPath))
        {
            _logger.LogError("Share card font not found: {Path}", fontPath);
            return null;
        }

        var collection = new FontCollection();
        var fam = collection.Add(fontPath);
        var fontTitle = fam.CreateFont(48, FontStyle.Bold);
        var fontService = fam.CreateFont(32, FontStyle.Bold);
        var fontMeta = fam.CreateFont(24, FontStyle.Regular);
        var fontSmall = fam.CreateFont(20, FontStyle.Regular);

        using var image = new Image<Rgba32>(W, H, BgNavy);
        image.Mutate(c =>
        {
            c.Fill(Color.White, new SixLabors.ImageSharp.Drawing.RectangularPolygon(
                Pad, Pad, W - Pad * 2, H - Pad * 2));
        });

        const int avSize = 300;
        var avX = (W - avSize) / 2;
        const int avY = Pad + 64;
        Image<Rgba32>? avatar = null;
        if (!string.IsNullOrWhiteSpace(row.ProfileImageUrl) &&
            Uri.TryCreate(row.ProfileImageUrl, UriKind.Absolute, out var imgUri) &&
            (imgUri.Scheme == Uri.UriSchemeHttp || imgUri.Scheme == Uri.UriSchemeHttps))
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("image/*"));
                client.Timeout = TimeSpan.FromSeconds(12);
                var bytes = await client.GetByteArrayAsync(imgUri, ct);
                avatar = await Image.LoadAsync<Rgba32>(new MemoryStream(bytes, writable: false), ct);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Provider share card: could not load profile image");
            }
        }

        image.Mutate(c =>
        {
            if (avatar is not null)
            {
                avatar.Mutate(a => a.Resize(new ResizeOptions
                {
                    Size = new Size(avSize, avSize),
                    Mode = ResizeMode.Crop,
                }));
                c.DrawImage(avatar, new Point(avX, avY), 1f);
            }
            else
            {
                c.Fill(Accent, new SixLabors.ImageSharp.Drawing.EllipsePolygon(
                    avX + avSize / 2f, avY + avSize / 2f, avSize * 0.9f));
                const string ph = "PO";
                var pm = TextMeasurer.MeasureSize(ph, new TextOptions(fam.CreateFont(96, FontStyle.Bold)));
                c.DrawText(
                    ph,
                    fam.CreateFont(96, FontStyle.Bold),
                    Ink,
                    new PointF(avX + (avSize - pm.Width) / 2f, avY + (avSize - pm.Height) / 2f - 6));
            }
        });
        avatar?.Dispose();

        var ratingText = row.AverageRating is { } r
            ? $"★ {r:0.0}  ·  {row.ReviewCount} reviews"
            : "New on PetOwner";
        var serviceText = !string.IsNullOrWhiteSpace(row.PrimaryServiceName)
            ? row.PrimaryServiceName
            : "Pet care";
        var nameText = (row.Name ?? "Provider").Trim();
        if (nameText.Length > 48) nameText = nameText[..46] + "…";
        if (serviceText.Length > 50) serviceText = serviceText[..48] + "…";

        var y = avY + avSize + 44;
        DrawCentered(image, nameText, fontTitle, Ink, y);
        y += (int)TextMeasurer.MeasureSize(nameText, new TextOptions(fontTitle) { Dpi = 72 }).Height + 16;
        DrawCentered(image, serviceText, fontService, Accent, y);
        y += (int)TextMeasurer.MeasureSize(serviceText, new TextOptions(fontService) { Dpi = 72 }).Height + 12;
        DrawCentered(image, ratingText, fontMeta, Muted, y);
        y += (int)TextMeasurer.MeasureSize(ratingText, new TextOptions(fontMeta) { Dpi = 72 }).Height + 32;

        using (var qrImg = Image.Load<Rgba32>(new MemoryStream(qrPng, writable: false)))
        {
            const int qrTarget = 300;
            qrImg.Mutate(q => q.Resize(new Size(qrTarget, qrTarget)));
            var qrX = (W - qrTarget) / 2;
            var qrY = H - Pad - 300;
            image.Mutate(c => c.DrawImage(qrImg, new Point(qrX, qrY), 1f));
        }

        const string tag = "petowner.app";
        DrawCentered(image, tag, fontSmall, Muted, H - Pad - 28);

        await using var outMs = new MemoryStream();
        await image.SaveAsPngAsync(outMs, ct);
        return outMs.ToArray();
    }

    private static void DrawCentered(
        Image<Rgba32> image,
        string text,
        Font font,
        Color color,
        float topY)
    {
        if (string.IsNullOrEmpty(text)) return;
        var m = TextMeasurer.MeasureSize(text, new TextOptions(font) { Dpi = 72 });
        var x = (W - m.Width) / 2f;
        image.Mutate(c => c.DrawText(text, font, color, new PointF(x, topY)));
    }

    private string BuildPublicWebUrl(Guid providerId)
    {
        var template = _config["ProviderShare:WebProfileUrlTemplate"]?.Trim();
        if (string.IsNullOrEmpty(template))
            template = "https://petowner.app/p/{0}";
        return string.Format(CultureInfo.InvariantCulture, template, providerId);
    }

    private static byte[]? BuildQrPngBytes(string text)
    {
        try
        {
            using var gen = new QRCodeGenerator();
            var data = gen.CreateQrCode(text, QRCodeGenerator.ECCLevel.Q);
            var png = new PngByteQRCode(data);
            var dark = new[] { (byte)0, (byte)26, (byte)90, (byte)255 };
            var light = new[] { (byte)255, (byte)255, (byte)255, (byte)255 };
            return png.GetGraphic(8, dark, light, true);
        }
        catch
        {
            return null;
        }
    }
}
