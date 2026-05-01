using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSmartSchedulingFieldsAndBookingPets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BufferTimeMinutes",
                table: "ProviderServiceRates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FixedDurationMinutes",
                table: "ProviderServiceRates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxConcurrentBookings",
                table: "ProviderServiceRates",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "MaxPetCapacity",
                table: "ProviderServiceRates",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "BookingPets",
                columns: table => new
                {
                    BookingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingPets", x => new { x.BookingId, x.PetId });
                    table.ForeignKey(
                        name: "FK_BookingPets_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BookingPets_Pets_PetId",
                        column: x => x.PetId,
                        principalTable: "Pets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BookingPets_PetId",
                table: "BookingPets",
                column: "PetId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookingPets");

            migrationBuilder.DropColumn(
                name: "BufferTimeMinutes",
                table: "ProviderServiceRates");

            migrationBuilder.DropColumn(
                name: "FixedDurationMinutes",
                table: "ProviderServiceRates");

            migrationBuilder.DropColumn(
                name: "MaxConcurrentBookings",
                table: "ProviderServiceRates");

            migrationBuilder.DropColumn(
                name: "MaxPetCapacity",
                table: "ProviderServiceRates");
        }
    }
}
