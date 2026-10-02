using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMind.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModelToDocument : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Model",
                table: "Documents",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Model",
                table: "Documents");
        }
    }
}
