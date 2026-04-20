using ClosedXML.Excel;

namespace PetOwner.Api.Infrastructure;

internal static class StatsExportXlsx
{
    internal sealed record OwnerSpendingExportRow(
        Guid BookingId,
        DateTime CreatedAt,
        DateTime StartDate,
        DateTime EndDate,
        string Service,
        string ProviderName,
        decimal TotalPriceIls,
        string Status);

    internal sealed record ProviderEarningsExportRow(
        Guid BookingId,
        DateTime CreatedAt,
        DateTime StartDate,
        DateTime EndDate,
        string Service,
        string OwnerName,
        decimal TotalPriceIls,
        string Status);

    internal static byte[] BuildOwnerSpendingWorkbook(IReadOnlyList<OwnerSpendingExportRow> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Paid bookings");

        ws.Cell(1, 1).Value = "BookingId";
        ws.Cell(1, 2).Value = "CreatedAt";
        ws.Cell(1, 3).Value = "StartDate";
        ws.Cell(1, 4).Value = "EndDate";
        ws.Cell(1, 5).Value = "Service";
        ws.Cell(1, 6).Value = "ProviderName";
        ws.Cell(1, 7).Value = "TotalPriceILS";
        ws.Cell(1, 8).Value = "Status";

        var header = ws.Range(1, 1, 1, 8);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.LightGray;

        var r = 2;
        foreach (var row in rows)
        {
            ws.Cell(r, 1).Value = row.BookingId.ToString();
            ws.Cell(r, 2).Value = row.CreatedAt;
            ws.Cell(r, 3).Value = row.StartDate;
            ws.Cell(r, 4).Value = row.EndDate;
            ws.Cell(r, 5).Value = row.Service;
            ws.Cell(r, 6).Value = row.ProviderName;
            ws.Cell(r, 7).Value = row.TotalPriceIls;
            ws.Cell(r, 8).Value = row.Status;
            r++;
        }

        ws.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }

    internal static byte[] BuildProviderEarningsWorkbook(IReadOnlyList<ProviderEarningsExportRow> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Paid bookings");

        ws.Cell(1, 1).Value = "BookingId";
        ws.Cell(1, 2).Value = "CreatedAt";
        ws.Cell(1, 3).Value = "StartDate";
        ws.Cell(1, 4).Value = "EndDate";
        ws.Cell(1, 5).Value = "Service";
        ws.Cell(1, 6).Value = "OwnerName";
        ws.Cell(1, 7).Value = "TotalPriceILS";
        ws.Cell(1, 8).Value = "Status";

        var header = ws.Range(1, 1, 1, 8);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.LightGray;

        var r = 2;
        foreach (var row in rows)
        {
            ws.Cell(r, 1).Value = row.BookingId.ToString();
            ws.Cell(r, 2).Value = row.CreatedAt;
            ws.Cell(r, 3).Value = row.StartDate;
            ws.Cell(r, 4).Value = row.EndDate;
            ws.Cell(r, 5).Value = row.Service;
            ws.Cell(r, 6).Value = row.OwnerName;
            ws.Cell(r, 7).Value = row.TotalPriceIls;
            ws.Cell(r, 8).Value = row.Status;
            r++;
        }

        ws.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }
}
