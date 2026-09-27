using CodeMind.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CodeMind.Api.Controllers;

[ApiController]
[Route("api/internal/keys")]
public class InternalKeyVaultController : ControllerBase
{
    private readonly ITempKeyVaultService _vaultService;
    private readonly ILogger<InternalKeyVaultController> _logger;

    public InternalKeyVaultController(ITempKeyVaultService vaultService, ILogger<InternalKeyVaultController> logger)
    {
        _vaultService = vaultService;
        _logger = logger;
    }

    public record KeyConsumeRequest(string KeyToken);

    [HttpPost("consume")]
    public IActionResult ConsumeKey([FromBody] KeyConsumeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.KeyToken))
            return BadRequest(new { Message = "KeyToken is required" });

        var apiKey = _vaultService.GetKey(request.KeyToken);
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("Internal key request failed: token {KeyToken} not found or expired", request.KeyToken);
            return NotFound(new { Message = "Key not found or expired" });
        }

        return Ok(new { ApiKey = apiKey, apiKey = apiKey });
    }
}
