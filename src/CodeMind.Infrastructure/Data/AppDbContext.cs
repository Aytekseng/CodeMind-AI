using CodeMind.Domain.Interfaces;
using CodeMind.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CodeMind.Infrastructure.Data;

// Entity Framework Core'un veritabanı ile uygulamamız arasındaki bağlantıyı sağlayan ana bağlam (Context) sınıfı
public class AppDbContext : DbContext, IAppDbContext
{
    private readonly ICurrentUserService _currentUserService;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUserService) : base(options)
    {
        _currentUserService = currentUserService;
    }

    // Veritabanındaki 'Tenants' (Şirketler) tablosuna karşılık gelen set
    public DbSet<Tenant> Tenants { get; set; }
    
    // Veritabanındaki 'Users' (Kullanıcılar) tablosuna karşılık gelen set
    public DbSet<User> Users { get; set; }
    
    // Veritabanındaki 'Projects' (Projeler) tablosuna karşılık gelen set
    public DbSet<Project> Projects { get; set; }
    
    // Veritabanındaki 'Documents' (Yüklenen Dosyalar) tablosuna karşılık gelen set
    public DbSet<Document> Documents { get; set; }
    
    // Veritabanındaki 'AnalysisReports' (AI Sonuçları) tablosuna karşılık gelen set
    public DbSet<AnalysisReport> AnalysisReports { get; set; }
    public DbSet<OutboxMessage> OutboxMessages { get; set; }
    

    public async Task<bool> LockTenantAsync(Guid tenantId)
    {
        if (Database.CurrentTransaction == null)
            throw new InvalidOperationException("Tenant mutations require an active transaction.");
        var rows = await Tenants.FromSqlInterpolated($"SELECT * FROM \"Tenants\" WHERE \"Id\" = {tenantId} FOR UPDATE")
            .IgnoreQueryFilters().AsNoTracking().ToListAsync();
        return rows.Count == 1;
    }

    public async Task DeleteLegacyEmbeddingsAsync(Guid[] documentIds)
    {
        var exists = await Database.SqlQuery<bool>($"SELECT to_regclass('public.langchain_pg_embedding') IS NOT NULL AS \"Value\"").SingleAsync();
        if (!exists) return;
        var ids = documentIds.Select(id => id.ToString()).ToArray();
        await Database.ExecuteSqlInterpolatedAsync($"DELETE FROM langchain_pg_embedding WHERE cmetadata->>'file_id' = ANY ({ids})");
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enum değerlerinin (Free, Pro vb.) veritabanına tam sayı(int) yerine metin(string) olarak kaydedilmesi
        modelBuilder.Entity<Tenant>()
            .Property(t => t.SubscriptionTier)
            .HasConversion<string>();

        // Doküman durumlarının (Pending, Completed vb.) veritabanına metin(string) olarak kaydedilmesi
        modelBuilder.Entity<Document>()
            .Property(d => d.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Tenant>().HasQueryFilter(t => t.Id == _currentUserService.TenantId);
        modelBuilder.Entity<User>().HasQueryFilter(u => u.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Project>().HasQueryFilter(p => p.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<Document>().HasQueryFilter(d => d.Project.TenantId == _currentUserService.TenantId &&
            (_currentUserService.Role == "Admin" || _currentUserService.Role == "Auditor" ||
             d.UploadedByUserId == _currentUserService.UserId));
        modelBuilder.Entity<AnalysisReport>().HasQueryFilter(a => a.Document.Project.TenantId == _currentUserService.TenantId &&
            (_currentUserService.Role == "Admin" || _currentUserService.Role == "Auditor" ||
             a.Document.UploadedByUserId == _currentUserService.UserId));
        modelBuilder.Entity<Document>().Property(d => d.Status).IsConcurrencyToken();
        modelBuilder.Entity<OutboxMessage>().HasOne(o => o.Document).WithMany().HasForeignKey(o => o.DocumentId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<OutboxMessage>().HasQueryFilter(o => o.Document.Project.TenantId == _currentUserService.TenantId);
    }
}
