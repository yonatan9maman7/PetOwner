using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLostPetSosFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "Pets",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsLost",
                table: "Pets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "LastSeenLat",
                table: "Pets",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "LastSeenLng",
                table: "Pets",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastSeenLocation",
                table: "Pets",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LostAt",
                table: "Pets",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "IsLost",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "LastSeenLat",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "LastSeenLng",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "LastSeenLocation",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "LostAt",
                table: "Pets");
        }
    }
}
