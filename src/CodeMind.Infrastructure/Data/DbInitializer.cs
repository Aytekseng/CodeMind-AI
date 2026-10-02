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
            var hasTenants = await context.Tenants.IgnoreQueryFilters().AnyAsync();
            if (!hasTenants)
            {
                logger.LogInformation("Sistemde kayıtlı organizasyon bulunamadı. Varsayılan demo veriler oluşturuluyor...");

                var demoTenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    Name = "CodeMind Security Corp",
                    SubscriptionTier = SubscriptionTier.Enterprise
                };

                context.Tenants.Add(demoTenant);

                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = demoTenant.Id,
                    Email = "admin@codemind.ai",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    FirstName = "System",
                    LastName = "Administrator",
                    Role = "Admin",
                    MustChangePassword = false
                };

                var devUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = demoTenant.Id,
                    Email = "dev@codemind.ai",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    FirstName = "Junior",
                    LastName = "Developer",
                    Role = "Developer",
                    MustChangePassword = false
                };

                var demoProject = new Project
                {
                    Id = Guid.NewGuid(),
                    TenantId = demoTenant.Id,
                    Name = "Sample Vulnerability Scanner Project"
                };

                context.Users.AddRange(adminUser, devUser);
                context.Projects.Add(demoProject);

                await context.SaveChangesAsync();
                logger.LogInformation("Varsayılan demo hesaplar başarıyla oluşturuldu! (admin@codemind.ai / dev@codemind.ai - Parola: Password123!)");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Veritabanı başlatılırken (migration/seed) bir hata oluştu.");
            throw;
        }
    }
}
