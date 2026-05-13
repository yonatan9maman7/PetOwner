using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingBreakdownToBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "GrossAmount",
                table: "Bookings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ProviderNetAmount",
                table: "Bookings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceFee",
                table: "Bookings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GrossAmount",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ProviderNetAmount",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ServiceFee",
                table: "Bookings");
        }
    }
}
