using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class CommunityRedesignExtensions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "Posts",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DogName",
                table: "Posts",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HelpfulCount",
                table: "Posts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsAnonymous",
                table: "Posts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSeenAt",
                table: "Posts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RelatedPetId",
                table: "Posts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SosNotifyRadiusKm",
                table: "Posts",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SosResolvedAt",
                table: "Posts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TagsCsv",
                table: "Posts",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Posts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AgeFilterCsv",
                table: "PlaydateEvents",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DogSizeCsv",
                table: "PlaydateEvents",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "PlaydateEvents",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnergyLevel",
                table: "PlaydateEvents",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LinkedCommunityGroupId",
                table: "PlaydateEvents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MeetupType",
                table: "PlaydateEvents",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MeetupVisibility",
                table: "PlaydateEvents",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Public");

            migrationBuilder.AddColumn<bool>(
                name: "VaccinatedOnly",
                table: "PlaydateEvents",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "GroupKind",
                table: "CommunityGroups",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Location");

            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "CommunityGroups",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RulesText",
                table: "CommunityGroups",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CommunityReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    ReporterUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    TargetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false, defaultValue: "Open"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommunityReports_Users_ReporterUserId",
                        column: x => x.ReporterUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CommunitySavedPosts",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SavedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunitySavedPosts", x => new { x.UserId, x.PostId });
                    table.ForeignKey(
                        name: "FK_CommunitySavedPosts_Posts_PostId",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CommunitySavedPosts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CommunitySosSightings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunitySosSightings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommunitySosSightings_Posts_PostId",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CommunitySosSightings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DogParkCheckIns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PetId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PlaceId = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PlaceName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DogParkCheckIns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DogParkCheckIns_Pets_PetId",
                        column: x => x.PetId,
                        principalTable: "Pets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DogParkCheckIns_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PostHelpfulMarks",
                columns: table => new
                {
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PostHelpfulMarks", x => new { x.PostId, x.UserId });
                    table.ForeignKey(
                        name: "FK_PostHelpfulMarks_Posts_PostId",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PostHelpfulMarks_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserCommunityPrefs",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShowExactLocation = table.Column<bool>(type: "bit", nullable: false),
                    DmPolicy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Everyone"),
                    AllowMeetupInvites = table.Column<bool>(type: "bit", nullable: false),
                    ShowDogInCommunity = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserCommunityPrefs", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserCommunityPrefs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_RelatedPetId",
                table: "Posts",
                column: "RelatedPetId");

            migrationBuilder.CreateIndex(
                name: "IX_PlaydateEvents_LinkedCommunityGroupId",
                table: "PlaydateEvents",
                column: "LinkedCommunityGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunityReports_ReporterUserId",
                table: "CommunityReports",
                column: "ReporterUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunitySavedPosts_PostId",
                table: "CommunitySavedPosts",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunitySosSightings_PostId_CreatedAt",
                table: "CommunitySosSightings",
                columns: new[] { "PostId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CommunitySosSightings_UserId",
                table: "CommunitySosSightings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DogParkCheckIns_ExpiresAt",
                table: "DogParkCheckIns",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_DogParkCheckIns_PetId",
                table: "DogParkCheckIns",
                column: "PetId");

            migrationBuilder.CreateIndex(
                name: "IX_DogParkCheckIns_UserId_ExpiresAt",
                table: "DogParkCheckIns",
                columns: new[] { "UserId", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PostHelpfulMarks_UserId",
                table: "PostHelpfulMarks",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_PlaydateEvents_CommunityGroups_LinkedCommunityGroupId",
                table: "PlaydateEvents",
                column: "LinkedCommunityGroupId",
                principalTable: "CommunityGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Pets_RelatedPetId",
                table: "Posts",
                column: "RelatedPetId",
                principalTable: "Pets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PlaydateEvents_CommunityGroups_LinkedCommunityGroupId",
                table: "PlaydateEvents");

            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Pets_RelatedPetId",
                table: "Posts");

            migrationBuilder.DropTable(
                name: "CommunityReports");

            migrationBuilder.DropTable(
                name: "CommunitySavedPosts");

            migrationBuilder.DropTable(
                name: "CommunitySosSightings");

            migrationBuilder.DropTable(
                name: "DogParkCheckIns");

            migrationBuilder.DropTable(
                name: "PostHelpfulMarks");

            migrationBuilder.DropTable(
                name: "UserCommunityPrefs");

            migrationBuilder.DropIndex(
                name: "IX_Posts_RelatedPetId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_PlaydateEvents_LinkedCommunityGroupId",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "DogName",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "HelpfulCount",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "IsAnonymous",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "RelatedPetId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "SosNotifyRadiusKm",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "SosResolvedAt",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "TagsCsv",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "AgeFilterCsv",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "DogSizeCsv",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "EnergyLevel",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "LinkedCommunityGroupId",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "MeetupType",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "MeetupVisibility",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "VaccinatedOnly",
                table: "PlaydateEvents");

            migrationBuilder.DropColumn(
                name: "GroupKind",
                table: "CommunityGroups");

            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "CommunityGroups");

            migrationBuilder.DropColumn(
                name: "RulesText",
                table: "CommunityGroups");
        }
    }
}
