using System;
using System.Threading.Tasks;
using CodeMind.Domain.Entities;
using CodeMind.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMind.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext context, ILogger logger)
    {
        try
        {
            logger.LogInformation("Veritabanı migration kontrolü yapılıyor...");
            await context.Database.MigrateAsync();
            logger.LogInformation("Veritabanı migration başarıyla tamamlandı.");

            // Varsayılan şirket ve admin kontrolü
            var defaultTenant = await context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Name == "CodeMind Security Corp")
                ?? await context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync();

            if (defaultTenant == null)
            {
                logger.LogInformation("Sistemde kayıtlı organizasyon bulunamadı. Varsayılan demo veriler oluşturuluyor...");

                defaultTenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    Name = "CodeMind Security Corp",
                    SubscriptionTier = SubscriptionTier.Enterprise
                };

                context.Tenants.Add(defaultTenant);
                await context.SaveChangesAsync();
            }

            var adminExists = await context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == "admin@codemind.ai");
            if (!adminExists)
            {
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = defaultTenant.Id,
                    Email = "admin@codemind.ai",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    FirstName = "System",
                    LastName = "Administrator",
                    Role = "Admin",
                    MustChangePassword = false
                };
                context.Users.Add(adminUser);
            }

            var devExists = await context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == "dev@codemind.ai");
            if (!devExists)
            {
                var devUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = defaultTenant.Id,
                    Email = "dev@codemind.ai",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    FirstName = "Junior",
                    LastName = "Developer",
                    Role = "Developer",
                    MustChangePassword = false
                };
                context.Users.Add(devUser);
            }

            var hasProjects = await context.Projects.IgnoreQueryFilters().AnyAsync(p => p.TenantId == defaultTenant.Id);
            if (!hasProjects)
            {
                var demoProject = new Project
                {
                    Id = Guid.NewGuid(),
                    TenantId = defaultTenant.Id,
                    Name = "Sample Vulnerability Scanner Project"
                };
                context.Projects.Add(demoProject);
            }

            await context.SaveChangesAsync();
            logger.LogInformation("Varsayılan demo hesaplar kontrol edildi ve hazırlandı (admin@codemind.ai / dev@codemind.ai - Parola: Password123!)");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Veritabanı başlatılırken (migration/seed) bir hata oluştu.");
            throw;
        }
    }
}
