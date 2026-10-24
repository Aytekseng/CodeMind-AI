using System.Security.Claims;
using CodeMind.Domain.Entities;
namespace CodeMind.Api.Security;
public static class SessionAuthorization
{
    public static bool Matches(User? user, ClaimsPrincipal claims) => user != null &&
        Guid.TryParse(claims.FindFirstValue(ClaimTypes.NameIdentifier), out var id) && id == user.Id &&
        Guid.TryParse(claims.FindFirstValue("TenantId"), out var tenant) && tenant != Guid.Empty && tenant == user.TenantId &&
        !string.IsNullOrEmpty(user.SecurityStamp) && user.SecurityStamp == claims.FindFirstValue("SecurityStamp") &&
        user.Role == claims.FindFirstValue(ClaimTypes.Role) &&
        user.MustChangePassword.ToString() == claims.FindFirstValue("MustChangePassword");
}
