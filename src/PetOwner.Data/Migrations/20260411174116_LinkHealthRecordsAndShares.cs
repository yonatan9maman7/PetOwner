using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class LinkHealthRecordsAndShares : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentUrl",
                table: "Vaccinations",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VaccinationId",
                table: "MedicalRecords",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WeightLogId",
                table: "MedicalRecords",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PetHealthShares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    PetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PetHealthShares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PetHealthShares_Pets_PetId",
                        column: x => x.PetId,
                        principalTable: "Pets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MedicalRecords_VaccinationId",
                table: "MedicalRecords",
                column: "VaccinationId",
                unique: true,
                filter: "[VaccinationId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalRecords_WeightLogId",
                table: "MedicalRecords",
                column: "WeightLogId",
                unique: true,
                filter: "[WeightLogId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PetHealthShares_PetId",
                table: "PetHealthShares",
                column: "PetId");

            migrationBuilder.CreateIndex(
                name: "IX_PetHealthShares_Token",
                table: "PetHealthShares",
                column: "Token",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MedicalRecords_Vaccinations_VaccinationId",
                table: "MedicalRecords",
                column: "VaccinationId",
                principalTable: "Vaccinations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_MedicalRecords_WeightLogs_WeightLogId",
                table: "MedicalRecords",
                column: "WeightLogId",
                principalTable: "WeightLogs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MedicalRecords_Vaccinations_VaccinationId",
                table: "MedicalRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_MedicalRecords_WeightLogs_WeightLogId",
                table: "MedicalRecords");

            migrationBuilder.DropTable(
                name: "PetHealthShares");

            migrationBuilder.DropIndex(
                name: "IX_MedicalRecords_VaccinationId",
                table: "MedicalRecords");

            migrationBuilder.DropIndex(
                name: "IX_MedicalRecords_WeightLogId",
                table: "MedicalRecords");

            migrationBuilder.DropColumn(
                name: "DocumentUrl",
                table: "Vaccinations");

            migrationBuilder.DropColumn(
                name: "VaccinationId",
                table: "MedicalRecords");

            migrationBuilder.DropColumn(
                name: "WeightLogId",
                table: "MedicalRecords");
        }
    }
}
