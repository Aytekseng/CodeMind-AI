using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
namespace CodeMind.Api.Security;
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class WorkerAuthorizationAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var expected = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>()["Worker:Secret"] ?? "";
        var supplied = context.HttpContext.Request.Headers["X-Worker-Secret"].ToString();
        if (expected.Length < 32 || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(supplied)))
            context.Result = new UnauthorizedResult();
    }
}
