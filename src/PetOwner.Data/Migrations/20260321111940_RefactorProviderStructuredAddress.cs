using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class RefactorProviderStructuredAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IdNumber",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "Locations");

            migrationBuilder.AddColumn<string>(
                name: "ApartmentNumber",
                table: "ProviderProfiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuildingNumber",
                table: "ProviderProfiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "ProviderProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Street",
                table: "ProviderProfiles",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApartmentNumber",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "BuildingNumber",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "City",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "Street",
                table: "ProviderProfiles");

            migrationBuilder.AddColumn<string>(
                name: "IdNumber",
                table: "ProviderProfiles",
                type: "nvarchar(9)",
                maxLength: 9,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Locations",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }
    }
}
