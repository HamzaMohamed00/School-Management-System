using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDeleteBehaviors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClassRooms_Teachers_TeacherId",
                table: "ClassRooms");

            migrationBuilder.DropForeignKey(
                name: "FK_Sessions_Subjects_SubjectId",
                table: "Sessions");

            migrationBuilder.AddForeignKey(
                name: "FK_ClassRooms_Teachers_TeacherId",
                table: "ClassRooms",
                column: "TeacherId",
                principalTable: "Teachers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Sessions_Subjects_SubjectId",
                table: "Sessions",
                column: "SubjectId",
                principalTable: "Subjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClassRooms_Teachers_TeacherId",
                table: "ClassRooms");

            migrationBuilder.DropForeignKey(
                name: "FK_Sessions_Subjects_SubjectId",
                table: "Sessions");

            migrationBuilder.AddForeignKey(
                name: "FK_ClassRooms_Teachers_TeacherId",
                table: "ClassRooms",
                column: "TeacherId",
                principalTable: "Teachers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sessions_Subjects_SubjectId",
                table: "Sessions",
                column: "SubjectId",
                principalTable: "Subjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
