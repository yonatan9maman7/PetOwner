using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaydateFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DogSize",
                table: "Pets",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Sterilization",
                table: "Pets",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TagsCsv",
                table: "Pets",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "PlaydateBeacons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlaceName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PetIdsCsv = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false, defaultValue: ""),
                    Species = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "DOG")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaydateBeacons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlaydateBeacons_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlaydateEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    HostUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LocationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ScheduledFor = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndsAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AllowedSpeciesCsv = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false, defaultValue: "DOG"),
                    MaxPets = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaydateEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlaydateEvents_Users_HostUserId",
                        column: x => x.HostUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlaydatePrefs",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OptedIn = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    MaxDistanceKm = table.Column<int>(type: "int", nullable: false, defaultValue: 5),
                    Bio = table.Column<string>(type: "nvarchar(280)", maxLength: 280, nullable: true),
                    PreferredSpeciesCsv = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false, defaultValue: ""),
                    PreferredDogSizesCsv = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: ""),
                    IncludeAsProvider = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastActiveAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaydatePrefs", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_PlaydatePrefs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlaydateEventComments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaydateEventComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlaydateEventComments_PlaydateEvents_EventId",
                        column: x => x.EventId,
                        principalTable: "PlaydateEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlaydateEventComments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlaydateRsvps",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PetId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaydateRsvps", x => new { x.EventId, x.UserId });
                    table.ForeignKey(
                        name: "FK_PlaydateRsvps_Pets_PetId",
                        column: x => x.PetId,
                        principalTable: "Pets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlaydateRsvps_PlaydateEvents_EventId",
                        column: x => x.EventId,
                        principalTable: "PlaydateEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlaydateRsvps_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateBeacons_ExpiresAt",
                table: "PlaydateBeacons",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateBeacons_Latitude_Longitude",
                table: "PlaydateBeacons",
                columns: new[] { "Latitude", "Longitude" });

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateBeacons_UserId_ExpiresAt",
                table: "PlaydateBeacons",
                columns: new[] { "UserId", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateEventComments_EventId_CreatedAt",
                table: "PlaydateEventComments",
                columns: new[] { "EventId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateEventComments_UserId",
                table: "PlaydateEventComments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateEvents_HostUserId",
                table: "PlaydateEvents",
                column: "HostUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateEvents_Latitude_Longitude",
                table: "PlaydateEvents",
                columns: new[] { "Latitude", "Longitude" });

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateEvents_ScheduledFor_CancelledAt",
                table: "PlaydateEvents",
                columns: new[] { "ScheduledFor", "CancelledAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PlaydatePrefs_OptedIn_LastActiveAt",
                table: "PlaydatePrefs",
                columns: new[] { "OptedIn", "LastActiveAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateRsvps_PetId",
                table: "PlaydateRsvps",
                column: "PetId");

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateRsvps_UserId",
                table: "PlaydateRsvps",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlaydateBeacons");

            migrationBuilder.DropTable(
                name: "PlaydateEventComments");

            migrationBuilder.DropTable(
                name: "PlaydatePrefs");

            migrationBuilder.DropTable(
                name: "PlaydateRsvps");

            migrationBuilder.DropTable(
                name: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "DogSize",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "Sterilization",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "TagsCsv",
                table: "Pets");
        }
    }
}
