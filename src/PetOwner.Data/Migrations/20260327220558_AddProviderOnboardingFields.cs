using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderOnboardingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BusinessName",
                table: "ProviderProfiles",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "ProviderProfiles",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSuspended",
                table: "ProviderProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "ProviderProfiles",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "ProviderProfiles",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "ProviderProfiles",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ServiceType",
                table: "ProviderProfiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuspensionReason",
                table: "ProviderProfiles",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BusinessName",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "IsSuspended",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "ServiceType",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "SuspensionReason",
                table: "ProviderProfiles");
        }
    }
}
