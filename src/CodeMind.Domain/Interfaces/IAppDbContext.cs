using System.Threading;
using System.Threading.Tasks;
using CodeMind.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace CodeMind.Domain.Interfaces;

public interface IAppDbContext
{
    DbSet<Tenant> Tenants { get; set; }
    DbSet<User> Users { get; set; }
    DbSet<Project> Projects { get; set; }
    DbSet<Document> Documents { get; set; }
    DbSet<AnalysisReport> AnalysisReports { get; set; }

    Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
