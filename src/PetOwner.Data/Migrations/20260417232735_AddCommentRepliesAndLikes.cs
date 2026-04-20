using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetOwner.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentRepliesAndLikes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EditedAt",
                table: "PostComments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LikeCount",
                table: "PostComments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentCommentId",
                table: "PostComments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PostCommentLikes",
                columns: table => new
                {
                    CommentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PostCommentLikes", x => new { x.CommentId, x.UserId });
                    table.ForeignKey(
                        name: "FK_PostCommentLikes_PostComments_CommentId",
                        column: x => x.CommentId,
                        principalTable: "PostComments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PostCommentLikes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PostComments_ParentCommentId",
                table: "PostComments",
                column: "ParentCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_PostCommentLikes_CommentId",
                table: "PostCommentLikes",
                column: "CommentId");

            migrationBuilder.CreateIndex(
                name: "IX_PostCommentLikes_UserId",
                table: "PostCommentLikes",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_PostComments_PostComments_ParentCommentId",
                table: "PostComments",
                column: "ParentCommentId",
                principalTable: "PostComments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PostComments_PostComments_ParentCommentId",
                table: "PostComments");

            migrationBuilder.DropTable(
                name: "PostCommentLikes");

            migrationBuilder.DropIndex(
                name: "IX_PostComments_ParentCommentId",
                table: "PostComments");

            migrationBuilder.DropColumn(
                name: "EditedAt",
                table: "PostComments");

            migrationBuilder.DropColumn(
                name: "LikeCount",
                table: "PostComments");

            migrationBuilder.DropColumn(
                name: "ParentCommentId",
                table: "PostComments");
        }
    }
}
