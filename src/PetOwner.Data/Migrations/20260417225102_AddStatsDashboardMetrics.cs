using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStatsDashboardMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Push prefs tables were added to the model but never got their own migration; production DBs may lack them.
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[dbo].[UserPushTokens]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [UserPushTokens] (
                        [Id] uniqueidentifier NOT NULL CONSTRAINT [DF_UserPushTokens_Id] DEFAULT NEWSEQUENTIALID(),
                        [UserId] uniqueidentifier NOT NULL,
                        [Token] nvarchar(500) NOT NULL,
                        [Platform] nvarchar(10) NOT NULL,
                        [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_UserPushTokens_CreatedAt] DEFAULT (GETUTCDATE()),
                        [LastUsedAt] datetime2 NOT NULL CONSTRAINT [DF_UserPushTokens_LastUsedAt] DEFAULT (GETUTCDATE()),
                        CONSTRAINT [PK_UserPushTokens] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_UserPushTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
                    );
                    CREATE UNIQUE INDEX [IX_UserPushTokens_Token] ON [UserPushTokens] ([Token]);
                    CREATE INDEX [IX_UserPushTokens_UserId] ON [UserPushTokens] ([UserId]);
                END

                IF OBJECT_ID(N'[dbo].[UserNotificationPrefs]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [UserNotificationPrefs] (
                        [UserId] uniqueidentifier NOT NULL,
                        [PushEnabled] bit NOT NULL CONSTRAINT [DF_UserNotificationPrefs_PushEnabled] DEFAULT (CAST(1 AS bit)),
                        [Messages] bit NOT NULL CONSTRAINT [DF_UserNotificationPrefs_Messages] DEFAULT (CAST(1 AS bit)),
                        [Bookings] bit NOT NULL CONSTRAINT [DF_UserNotificationPrefs_Bookings] DEFAULT (CAST(1 AS bit)),
                        [Community] bit NOT NULL CONSTRAINT [DF_UserNotificationPrefs_Community] DEFAULT (CAST(1 AS bit)),
                        [Triage] bit NOT NULL CONSTRAINT [DF_UserNotificationPrefs_Triage] DEFAULT (CAST(1 AS bit)),
                        [Marketing] bit NOT NULL CONSTRAINT [DF_UserNotificationPrefs_Marketing] DEFAULT (CAST(1 AS bit)),
                        [UpdatedAt] datetime2 NOT NULL CONSTRAINT [DF_UserNotificationPrefs_UpdatedAt] DEFAULT (GETUTCDATE()),
                        CONSTRAINT [PK_UserNotificationPrefs] PRIMARY KEY ([UserId]),
                        CONSTRAINT [FK_UserNotificationPrefs_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
                    );
                END

                IF COL_LENGTH('dbo.UserNotificationPrefs', 'Achievements') IS NULL
                BEGIN
                    ALTER TABLE [UserNotificationPrefs] ADD [Achievements] bit NOT NULL CONSTRAINT [DF_UserNotificationPrefs_Achievements] DEFAULT (CAST(1 AS bit));
                END
                """);

            migrationBuilder.AddColumn<int>(
                name: "ProfileViewCount",
                table: "ProviderProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SearchAppearanceCount",
                table: "ProviderProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CancelledByRole",
                table: "Bookings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RespondedAt",
                table: "Bookings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AchievementsUnlocked",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    UnlockedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AchievementsUnlocked", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AchievementsUnlocked_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AchievementsUnlocked_UserId_Code",
                table: "AchievementsUnlocked",
                columns: new[] { "UserId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AchievementsUnlocked");

            migrationBuilder.DropColumn(
                name: "Achievements",
                table: "UserNotificationPrefs");

            migrationBuilder.DropColumn(
                name: "ProfileViewCount",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "SearchAppearanceCount",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "CancelledByRole",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RespondedAt",
                table: "Bookings");
        }
    }
}
