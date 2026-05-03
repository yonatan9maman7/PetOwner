using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDogParks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DogParks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DogParks", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DogParks_IsActive",
                table: "DogParks",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_DogParks_Latitude_Longitude",
                table: "DogParks",
                columns: new[] { "Latitude", "Longitude" });

            // Initial catalog (Tel Aviv / Ramat Gan) — fixed IDs match DatabaseSeeder.EnsureDogParksSeededAsync.
            migrationBuilder.InsertData(
                table: "DogParks",
                columns: new[] { "Id", "Name", "Address", "Latitude", "Longitude", "IsActive" },
                values: new object[,]
                {
                    {
                        new Guid("a1b2c3d4-e5f6-4789-a012-000000000001"),
                        "גינת כלבים — גן מאיר (Meir Park)",
                        "גן מאיר, תל אביב-יפו",
                        32.0719,
                        34.7745,
                        true,
                    },
                    {
                        new Guid("a1b2c3d4-e5f6-4789-a012-000000000002"),
                        "גינת כלבים — פארק הירקון (Yarkon Park)",
                        "פארק הירקון, תל אביב-יפו",
                        32.0992,
                        34.8114,
                        true,
                    },
                    {
                        new Guid("a1b2c3d4-e5f6-4789-a012-000000000003"),
                        "גינת כלבים — גינת דובנוב",
                        "רח׳ דובנוב, תל אביב-יפו",
                        32.0795,
                        34.7763,
                        true,
                    },
                    {
                        new Guid("a1b2c3d4-e5f6-4789-a012-000000000004"),
                        "גינת כלבים — פארק הלאומי רמת גן",
                        "פארק הלאומי, רמת גן",
                        32.0884,
                        34.8248,
                        true,
                    },
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DogParks");
        }
    }
}
