using System.Security.Claims;
using CodeMind.Api.Security;
using CodeMind.Application.Services;
using CodeMind.Domain.Entities;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using CodeMind.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;

var checks = 0;
void Check(bool ok, string message) { if (!ok) throw new Exception(message); checks++; Console.WriteLine("PASS " + message); }
var user = new User { Id = Guid.NewGuid(), TenantId = Guid.NewGuid(), Role = "Admin" };
ClaimsPrincipal Claims(User u) => new(new ClaimsIdentity(new[] {
    new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()), new Claim("TenantId", u.TenantId.ToString()),
    new Claim(ClaimTypes.Role, u.Role), new Claim("SecurityStamp", u.SecurityStamp),
    new Claim("MustChangePassword", u.MustChangePassword.ToString()) }, "test"));
var claims = Claims(user);
Check(SessionAuthorization.Matches(user, claims), "current session accepted");
Check(!SessionAuthorization.Matches(null, claims), "deleted user rejected");
user.SecurityStamp = Guid.NewGuid().ToString("N");
Check(!SessionAuthorization.Matches(user, claims), "rotated password/session rejected");
claims = Claims(user); user.Role = "Developer";
Check(!SessionAuthorization.Matches(user, claims), "demoted admin rejected");
claims = Claims(user); user.TenantId = Guid.NewGuid();
Check(!SessionAuthorization.Matches(user, claims), "different tenant rejected");
claims = Claims(user); user.MustChangePassword = true;
Check(!SessionAuthorization.Matches(user, claims), "changed password policy rejected");
using var cache = new MemoryCache(new MemoryCacheOptions());
var vault = new TempKeyVaultAdapter(cache);
var jobA = Guid.NewGuid(); var jobB = Guid.NewGuid();
vault.StoreKey(jobA, "key-A"); vault.StoreKey(jobB, "key-B"); vault.RemoveKey(jobA);
Check(vault.GetKey(jobA) == null && vault.GetKey(jobB) == "key-B", "job-bound keys purged independently");

var identity = new TestIdentity { TenantId = Guid.NewGuid(), UserId = Guid.NewGuid(), Role = "Developer" };
using var modelDb = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=localhost;Database=codemind_test").Options, identity);
var sql = modelDb.Documents.ToQueryString();
Check(sql.Contains("UploadedByUserId") && sql.Contains(identity.TenantId.ToString()), "document query enforces owner and tenant");
identity.TenantId = Guid.Empty;
Check(modelDb.Documents.ToQueryString().Contains(Guid.Empty.ToString()), "missing tenant does not disable filter");

identity.TenantId = Guid.NewGuid();
var guardedUpload = new DocumentService(new TestStorage(), new NoPublish(), modelDb, identity, vault, NullLogger<DocumentService>.Instance);
using (var oversized = new MemoryStream(new byte[1024 * 1024 + 1]))
{
    var rejected = false;
    try { await guardedUpload.UploadAndQueueDocumentAsync(oversized, "large.py", "text/plain"); }
    catch (ArgumentException) { rejected = true; }
    Check(rejected, "oversized source rejected before storage/database writes");
}
using (var compressed = new MemoryStream())
{
    using (var zip = new System.IO.Compression.ZipArchive(compressed, System.IO.Compression.ZipArchiveMode.Create, true))
    using (var entry = zip.CreateEntry("large.py").Open())
        entry.Write(new byte[1024 * 1024 + 1]);
    compressed.Position = 0;
    var rejected = false;
    try { await guardedUpload.UploadAndQueueZipAsync(compressed, "source.zip"); }
    catch (ArgumentException) { rejected = true; }
    Check(rejected, "compressed oversized source rejected before storage/database writes");
}

var connection = Environment.GetEnvironmentVariable("TEST_DATABASE_CONNECTION");
if (!string.IsNullOrEmpty(connection))
{
    var builder = new Npgsql.NpgsqlConnectionStringBuilder(connection);
    if (builder.Database?.EndsWith("_test") != true) throw new Exception("Integration DB must end in _test");
    var admin = new TestIdentity { TenantId = Guid.NewGuid(), UserId = Guid.NewGuid(), Role = "Admin" };
    var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connection).Options;
    await using var db = new AppDbContext(options, admin);
    await db.Database.MigrateAsync();
    var otherTenant = Guid.NewGuid(); var colleague = Guid.NewGuid();
    db.Tenants.AddRange(new Tenant { Id = admin.TenantId, Name = "Regression A" }, new Tenant { Id = otherTenant, Name = "Regression B" });
    var projectA = new Project { Id = Guid.NewGuid(), TenantId = admin.TenantId, Name = "A" };
    var projectB = new Project { Id = Guid.NewGuid(), TenantId = otherTenant, Name = "B" };
    db.Projects.AddRange(projectA, projectB);
    var own = new Document { Id = Guid.NewGuid(), ProjectId = projectA.Id, UploadedByUserId = admin.UserId, FileName = "own.py" };
    db.Documents.AddRange(own, new Document { Id = Guid.NewGuid(), ProjectId = projectA.Id, UploadedByUserId = colleague },
        new Document { Id = Guid.NewGuid(), ProjectId = projectB.Id, UploadedByUserId = admin.UserId });
    await db.SaveChangesAsync();
    Check(await db.Documents.CountAsync() == 2, "admin sees only own tenant documents");
    admin.Role = "Developer";
    Check(await db.Documents.CountAsync() == 1, "developer sees only own files");
    admin.Role = "Auditor";
    Check(await db.Documents.CountAsync() == 2, "auditor sees tenant reports");
    var storage = new TestStorage();
    var service = new DocumentService(storage, new NoPublish(), db, admin, vault, NullLogger<DocumentService>.Instance);
    Check(!(await service.CancelDocumentAnalysisAsync(own.Id)).IsSuccess, "auditor cannot cancel");
    admin.Role = "Developer";
    using var source = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("print(1)"));
    Check((await service.GetDashboardStatsAsync()).Data?.AverageScore == null,
        "pending files do not fabricate a dashboard security score");
    var uploaded = await service.UploadAndQueueDocumentAsync(source, "sample.py", "text/plain");
    Check(uploaded.IsSuccess && await db.OutboxMessages.CountAsync() == 1, "upload atomically persists outbox without publishing");
    var outbox = await db.OutboxMessages.SingleAsync();
    Check(await db.Documents.AnyAsync(d => d.Id == outbox.DocumentId), "outbox references committed document");
    // Concurrent completion must lose to an already committed cancellation.
    await using var staleDb = new AppDbContext(options, admin);
    var stale = await staleDb.Documents.SingleAsync(d => d.Id == own.Id);
    Check((await service.CancelDocumentAnalysisAsync(own.Id)).IsSuccess, "owner can cancel");
    stale.Status = CodeMind.Domain.Enums.DocumentStatus.Completed;
    var concurrencyRejected = false;
    try { await staleDb.SaveChangesAsync(); } catch (DbUpdateConcurrencyException) { concurrencyRejected = true; }
    Check(concurrencyRejected, "completion cannot overwrite concurrent cancellation");
    admin.TenantId = Guid.Empty;
    Check(await db.Documents.CountAsync() == 0, "missing context returns no documents in database");
    // Tenant row locks serialize admin invariants and source erasure with uploads.
    admin.TenantId = projectA.TenantId;
    var password = "Concurrency-Test-Password-2026!";
    var firstAdmin = new User { Id = Guid.NewGuid(), TenantId = admin.TenantId, Role = "Admin", Email = Guid.NewGuid() + "@example.test", PasswordHash = BCrypt.Net.BCrypt.HashPassword(password) };
    var secondAdmin = new User { Id = Guid.NewGuid(), TenantId = admin.TenantId, Role = "Admin", Email = Guid.NewGuid() + "@example.test", PasswordHash = firstAdmin.PasswordHash };
    db.Users.AddRange(firstAdmin, secondAdmin);
    await db.SaveChangesAsync();
    async Task<bool> DemoteSelf(Guid id)
    {
        var caller = new TestIdentity { TenantId = projectA.TenantId, UserId = id, Role = "Admin" };
        await using var context = new AppDbContext(options, caller);
        var team = new TeamService(context, caller, NullLogger<TeamService>.Instance, storage, vault);
        return (await team.UpdateMemberRoleAsync(id, new() { Role = "Developer" })).IsSuccess;
    }
    var demotions = await Task.WhenAll(DemoteSelf(firstAdmin.Id), DemoteSelf(secondAdmin.Id));
    Check(demotions.Count(ok => ok) == 1 && await db.Users.CountAsync(u => u.Role == "Admin") == 1,
        "concurrent demotions preserve the last admin");
    await db.Users.Where(u => u.Id == firstAdmin.Id || u.Id == secondAdmin.Id).ExecuteUpdateAsync(set => set.SetProperty(u => u.Role, "Admin"));
    async Task<bool> RemoveSelf(Guid id)
    {
        var caller = new TestIdentity { TenantId = projectA.TenantId, UserId = id, Role = "Admin" };
        await using var context = new AppDbContext(options, caller);
        var team = new TeamService(context, caller, NullLogger<TeamService>.Instance, storage, vault);
        return (await team.RemoveTeamMemberAsync(id)).IsSuccess;
    }
    var removals = await Task.WhenAll(RemoveSelf(firstAdmin.Id), RemoveSelf(secondAdmin.Id));
    Check(removals.Count(ok => ok) == 1 && await db.Users.CountAsync(u => u.Role == "Admin") == 1,
        "concurrent removals preserve the last admin");
    var survivor = await db.Users.AsNoTracking().SingleAsync(u => u.Role == "Admin");
    var deletionIdentity = new TestIdentity { TenantId = projectA.TenantId, UserId = survivor.Id, Role = "Admin" };
    await using var uploadDb = new AppDbContext(options, deletionIdentity);
    await using var deletionDb = new AppDbContext(options, deletionIdentity);
    var coordinatedStorage = new BlockingStorage();
    var uploader = new DocumentService(coordinatedStorage, new NoPublish(), uploadDb, deletionIdentity, vault, NullLogger<DocumentService>.Instance);
    var deleter = new TeamService(deletionDb, deletionIdentity, NullLogger<TeamService>.Instance, coordinatedStorage, vault);
    using var concurrentSource = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("print(1)"));
    var uploading = uploader.UploadAndQueueDocumentAsync(concurrentSource, "concurrent.py", "text/plain");
    await coordinatedStorage.UploadEntered.Task.WaitAsync(TimeSpan.FromSeconds(20));
    var deleting = deleter.DeleteCompanyWorkspaceAsync(new() { Password = password, ConfirmationCompanyName = "Regression A" });
    await Task.Delay(150);
    Check(!deleting.IsCompleted, "workspace deletion waits for an in-flight source upload");
    coordinatedStorage.Release.TrySetResult(true);
    Check((await uploading).IsSuccess && (await deleting).IsSuccess && coordinatedStorage.ObjectCount == 0,
        "concurrent upload and workspace deletion leave no orphan source object");
    // Only rows created by this run are removed.
    await db.Tenants.IgnoreQueryFilters().Where(t => t.Id == projectA.TenantId || t.Id == otherTenant).ExecuteDeleteAsync();
}
else Console.WriteLine("SKIP PostgreSQL integration: TEST_DATABASE_CONNECTION not set");
Console.WriteLine($"{checks} checks passed");

sealed class TestIdentity : ICurrentUserService
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public string Role { get; set; } = "";
}
sealed class TestStorage : IMinIOService
{
    public Task<string> UploadFileAsync(Stream stream, string name, string type) => Task.FromResult(Guid.NewGuid().ToString());
    public Task<string> GetFileTextAsync(string name) => Task.FromResult("test");
    public Task DeleteFileAsync(string name) => Task.CompletedTask;
}
sealed class NoPublish : IMessageProducer
{
    public Task ProduceAsync<T>(string topic, T message) => throw new Exception("Upload must use outbox");
}

sealed class BlockingStorage : IMinIOService
{
    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, bool> objects = new();
    public TaskCompletionSource<bool> UploadEntered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public TaskCompletionSource<bool> Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public int ObjectCount => objects.Count;
    public async Task<string> UploadFileAsync(Stream stream, string name, string type)
    {
        var key = Guid.NewGuid().ToString(); objects[key] = true;
        UploadEntered.TrySetResult(true);
        await Release.Task.WaitAsync(TimeSpan.FromSeconds(30));
        return key;
    }
    public Task<string> GetFileTextAsync(string name) => Task.FromResult("test");
    public Task DeleteFileAsync(string name) { objects.TryRemove(name, out _); return Task.CompletedTask; }
}
