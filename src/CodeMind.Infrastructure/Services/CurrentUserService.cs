using System.Security.Claims;
using CodeMind.Domain.Interfaces;
using Microsoft.AspNetCore.Http;

namespace CodeMind.Infrastructure.Services;

// ICurrentUserService arayüzünün (interface) uygulandığı (implemente edildiği) somut sınıf
public class CurrentUserService : ICurrentUserService
{
    // TODO: IHttpContextAccessor arayüzünü Constructor (Yapıcı Metot) üzerinden içeriye alın (Dependency Injection).
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    // TODO: Token'dan gelen Claims'leri (UserId, TenantId) okuyarak ICurrentUserService içindeki property'leri doldurun.

    public Guid UserId
    {
        get
        {
            var userIdStr = 
            _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdStr,out var id) ? id : Guid.Empty;
        }
    }

    public Guid TenantId
    {
        get
        {
            var tenantIdStr = _httpContextAccessor.HttpContext?.User?.FindFirstValue("TenantId");
            return Guid.TryParse(tenantIdStr, out var id) ? id : Guid.Empty;
        }
    }

}
