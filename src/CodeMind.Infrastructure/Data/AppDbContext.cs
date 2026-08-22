using CodeMind.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CodeMind.Infrastructure.Data;

// Entity Framework Core'un veritabanı ile uygulamamız arasındaki bağlantıyı sağlayan ana bağlam (Context) sınıfı
public class AppDbContext : DbContext
{
    private readonly CodeMind.Domain.Interfaces.ICurrentUserService _currentUserService;

    public AppDbContext(DbContextOptions<AppDbContext> options, CodeMind.Domain.Interfaces.ICurrentUserService currentUserService) : base(options)
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

        // Multi-tenancy (Çok Kiracılılık) için Row-Level Security (RLS) - Global Sorgu Filtresi
        // Auth token'ı yoksa (TenantId == Guid.Empty) filtre devreye girmez; token varsa ilgili şirketi filtreler.
        modelBuilder.Entity<User>().HasQueryFilter(u => _currentUserService.TenantId == Guid.Empty || u.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<Project>().HasQueryFilter(p => _currentUserService.TenantId == Guid.Empty || p.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<Document>().HasQueryFilter(d => _currentUserService.TenantId == Guid.Empty || d.Project.TenantId == _currentUserService.TenantId);
        modelBuilder.Entity<AnalysisReport>().HasQueryFilter(a => _currentUserService.TenantId == Guid.Empty || a.Document.Project.TenantId == _currentUserService.TenantId);
    }
}
