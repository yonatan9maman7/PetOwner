using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class SplitFeeModel_RenamePricingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ServiceFee",
                table: "Bookings",
                newName: "ProviderFee");

            migrationBuilder.RenameColumn(
                name: "GrossAmount",
                table: "Bookings",
                newName: "ClientFee");

            migrationBuilder.AddColumn<decimal>(
                name: "BasePrice",
                table: "Bookings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BasePrice",
                table: "Bookings");

            migrationBuilder.RenameColumn(
                name: "ProviderFee",
                table: "Bookings",
                newName: "ServiceFee");

            migrationBuilder.RenameColumn(
                name: "ClientFee",
                table: "Bookings",
                newName: "GrossAmount");
        }
    }
}
