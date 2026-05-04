using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDogParkExternalPlaceId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalPlaceId",
                table: "DogParks",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DogParks_ExternalPlaceId",
                table: "DogParks",
                column: "ExternalPlaceId",
                unique: true,
                filter: "[ExternalPlaceId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DogParks_ExternalPlaceId",
                table: "DogParks");

            migrationBuilder.DropColumn(
                name: "ExternalPlaceId",
                table: "DogParks");
        }
    }
}
