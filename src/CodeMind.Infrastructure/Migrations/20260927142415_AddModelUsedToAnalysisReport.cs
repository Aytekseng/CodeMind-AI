using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeMind.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModelUsedToAnalysisReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ModelUsed",
                table: "AnalysisReports",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModelUsed",
                table: "AnalysisReports");
        }
    }
}
