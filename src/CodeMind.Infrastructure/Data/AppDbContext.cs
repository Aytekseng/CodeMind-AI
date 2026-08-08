using CodeMind.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CodeMind.Infrastructure.Data;

// Entity Framework Core'un veritabanı ile uygulamamız arasındaki bağlantıyı sağlayan ana bağlam (Context) sınıfı
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
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
        // TODO: Auth servisi yazıldığında buraya anlık kullanıcının TenantId'si enjekte edilecek.
        Guid currentTenantId = Guid.Empty;

        // Tüm kullanıcı sorgularında sadece ilgili şirketin kullanıcıları filtrelenecek
        modelBuilder.Entity<User>().HasQueryFilter(u => u.TenantId == currentTenantId);
        
        // Tüm proje sorgularında sadece ilgili şirketin projeleri filtrelenecek
        modelBuilder.Entity<Project>().HasQueryFilter(p => p.TenantId == currentTenantId);
    }
}
