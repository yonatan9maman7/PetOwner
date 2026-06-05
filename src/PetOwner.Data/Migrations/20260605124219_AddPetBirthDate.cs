using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPetBirthDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "BirthDate",
                table: "Pets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE Pets SET BirthDate = DATEADD(year, -Age, GETUTCDATE()) WHERE Age > 0 AND BirthDate IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BirthDate",
                table: "Pets");
        }
    }
}
