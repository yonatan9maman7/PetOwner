using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderTypeAndBusinessFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsEmergencyService",
                table: "ProviderProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OpeningHours",
                table: "ProviderProfiles",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "ProviderProfiles",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Individual");

            migrationBuilder.AddColumn<string>(
                name: "WebsiteUrl",
                table: "ProviderProfiles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppNumber",
                table: "ProviderProfiles",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsEmergencyService",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "OpeningHours",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "WebsiteUrl",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "WhatsAppNumber",
                table: "ProviderProfiles");
        }
    }
}
