using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaydateGeoLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop the old composite index on Latitude + Longitude
            migrationBuilder.DropIndex(
                name: "IX_PlaydateEvents_Latitude_Longitude",
                table: "PlaydateEvents");

            // 2. Add nullable GeoLocation column so the backfill can run before enforcing NOT NULL
            migrationBuilder.AddColumn<Point>(
                name: "GeoLocation",
                table: "PlaydateEvents",
                type: "geography",
                nullable: true);

            // 3. Backfill GeoLocation from existing Latitude / Longitude float columns
            migrationBuilder.Sql(
                "UPDATE PlaydateEvents SET GeoLocation = geography::Point(Latitude, Longitude, 4326)");

            // 4. Make column NOT NULL now that every row has a value
            migrationBuilder.AlterColumn<Point>(
                name: "GeoLocation",
                table: "PlaydateEvents",
                type: "geography",
                nullable: false,
                oldClrType: typeof(Point),
                oldType: "geography",
                oldNullable: true);

            // 5. Drop the now-redundant float columns
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "PlaydateEvents");

            // 6. Add spatial index on GeoLocation
            migrationBuilder.Sql(
                "CREATE SPATIAL INDEX IX_PlaydateEvents_GeoLocation ON PlaydateEvents(GeoLocation)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop spatial index (raw SQL — no EF migration helper for SPATIAL DROP)
            migrationBuilder.Sql(
                "DROP INDEX IF EXISTS IX_PlaydateEvents_GeoLocation ON PlaydateEvents");

            // Restore float columns as nullable first
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "PlaydateEvents",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "PlaydateEvents",
                type: "float",
                nullable: true);

            // Backfill from GeoLocation
            migrationBuilder.Sql(
                "UPDATE PlaydateEvents SET Latitude = GeoLocation.Lat, Longitude = GeoLocation.Long");

            // Make non-nullable
            migrationBuilder.AlterColumn<double>(
                name: "Latitude",
                table: "PlaydateEvents",
                type: "float",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "float",
                oldNullable: true);

            migrationBuilder.AlterColumn<double>(
                name: "Longitude",
                table: "PlaydateEvents",
                type: "float",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "float",
                oldNullable: true);

            // Restore composite index
            migrationBuilder.CreateIndex(
                name: "IX_PlaydateEvents_Latitude_Longitude",
                table: "PlaydateEvents",
                columns: new[] { "Latitude", "Longitude" });

            // Drop GeoLocation column
            migrationBuilder.DropColumn(
                name: "GeoLocation",
                table: "PlaydateEvents");
        }
    }
}
