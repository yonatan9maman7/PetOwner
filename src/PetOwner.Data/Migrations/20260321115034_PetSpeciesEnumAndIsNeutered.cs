using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class PetSpeciesEnumAndIsNeutered : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HourlyRate",
                table: "ProviderProfiles");

            migrationBuilder.AddColumn<bool>(
                name: "IsNeutered",
                table: "Pets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SpeciesEnum",
                table: "Pets",
                type: "int",
                nullable: false,
                defaultValue: 6);

            migrationBuilder.Sql("""
                UPDATE Pets SET SpeciesEnum = CASE
                    WHEN LOWER(LTRIM(RTRIM(Species))) = 'dog' THEN 1
                    WHEN LOWER(LTRIM(RTRIM(Species))) = 'cat' THEN 2
                    WHEN LOWER(LTRIM(RTRIM(Species))) LIKE '%bird%' THEN 3
                    WHEN LOWER(LTRIM(RTRIM(Species))) LIKE '%rabbit%' THEN 4
                    WHEN LOWER(LTRIM(RTRIM(Species))) LIKE '%reptile%'
                        OR LOWER(LTRIM(RTRIM(Species))) LIKE '%snake%'
                        OR LOWER(LTRIM(RTRIM(Species))) LIKE '%lizard%' THEN 5
                    ELSE 6
                END
                """);

            migrationBuilder.DropColumn(
                name: "Species",
                table: "Pets");

            migrationBuilder.RenameColumn(
                name: "SpeciesEnum",
                table: "Pets",
                newName: "Species");

            migrationBuilder.CreateTable(
                name: "ProviderServiceRates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    ProviderProfileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Service = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Rate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderServiceRates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderServiceRates_ProviderProfiles_ProviderProfileId",
                        column: x => x.ProviderProfileId,
                        principalTable: "ProviderProfiles",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderServiceRates_ProviderProfileId_Service",
                table: "ProviderServiceRates",
                columns: new[] { "ProviderProfileId", "Service" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProviderServiceRates");

            migrationBuilder.RenameColumn(
                name: "Species",
                table: "Pets",
                newName: "SpeciesEnum");

            migrationBuilder.AddColumn<string>(
                name: "Species",
                table: "Pets",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Other");

            migrationBuilder.Sql("""
                UPDATE Pets SET Species = CASE SpeciesEnum
                    WHEN 1 THEN 'Dog'
                    WHEN 2 THEN 'Cat'
                    WHEN 3 THEN 'Bird'
                    WHEN 4 THEN 'Rabbit'
                    WHEN 5 THEN 'Reptile'
                    ELSE 'Other'
                END
                """);

            migrationBuilder.DropColumn(
                name: "SpeciesEnum",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "IsNeutered",
                table: "Pets");

            migrationBuilder.AddColumn<decimal>(
                name: "HourlyRate",
                table: "ProviderProfiles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
