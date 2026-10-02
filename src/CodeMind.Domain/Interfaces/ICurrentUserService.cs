using System;

namespace CodeMind.Domain.Interfaces;

public interface ICurrentUserService
{
    Guid UserId { get; }
    Guid TenantId { get; }
}
