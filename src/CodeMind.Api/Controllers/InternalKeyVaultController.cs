using CodeMind.Api.Security;
using CodeMind.Domain.Enums;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace CodeMind.Api.Controllers;
[ApiController, WorkerAuthorization]
[Route("api/internal/jobs")]
public class InternalKeyVaultController(AppDbContext db, ITempKeyVaultService vault) : ControllerBase
{
    [HttpPost("{id:guid}/context")]
    public async Task<IActionResult> GetContext(Guid id)
    {
        Response.Headers.CacheControl = "no-store";
        var doc = await db.Documents.IgnoreQueryFilters().Include(d => d.Project).FirstOrDefaultAsync(d => d.Id == id);
        if (doc == null) return NotFound();
        if (doc.Status is DocumentStatus.Cancelled or DocumentStatus.Completed or DocumentStatus.Failed)
            return Ok(new { status = doc.Status.ToString() });
        return Ok(new { status = doc.Status.ToString(), fileName = doc.FileName, objectKey = doc.StorageUrl,
            tenantId = doc.Project.TenantId, model = doc.Model, requiresApiKey = doc.RequiresApiKey,
            apiKey = doc.RequiresApiKey ? vault.GetKey(id) : null });
    }
}
