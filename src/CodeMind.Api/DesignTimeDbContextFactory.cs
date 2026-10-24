using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace CodeMind.Api;
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args) => new(
        new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=localhost;Database=codemind_design").Options,
        new DesignUser());
    private sealed class DesignUser : ICurrentUserService
    {
        public Guid UserId => Guid.Empty;
        public Guid TenantId => Guid.Empty;
        public string Role => "";
    }
}
