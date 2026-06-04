using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderBusinessGeoAndLiveMapToggle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Point>(
                name: "BusinessGeoLocation",
                table: "ProviderProfiles",
                type: "geography",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UseLiveLocationOnMap",
                table: "ProviderProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // Prefer structured address coords when present; otherwise copy legacy map location.
            migrationBuilder.Sql("""
                UPDATE ProviderProfiles
                SET BusinessGeoLocation = geography::Point(Longitude, Latitude, 4326)
                WHERE Latitude IS NOT NULL
                  AND Longitude IS NOT NULL
                  AND BusinessGeoLocation IS NULL;
                """);

            migrationBuilder.Sql("""
                UPDATE p
                SET p.BusinessGeoLocation = l.GeoLocation,
                    p.Latitude = l.GeoLocation.Lat,
                    p.Longitude = l.GeoLocation.Long
                FROM ProviderProfiles p
                INNER JOIN Locations l ON l.UserId = p.UserId
                WHERE p.BusinessGeoLocation IS NULL
                  AND l.GeoLocation IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BusinessGeoLocation",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "UseLiveLocationOnMap",
                table: "ProviderProfiles");
        }
    }
}
