using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
namespace CodeMind.Api.Hubs;
[Authorize]
public class AnalysisHub : Hub
{
    public static string UserGroup(Guid userId, string stamp) => $"user:{userId}:{stamp}";
    public override async Task OnConnectedAsync()
    {
        if (!Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ||
            Context.User?.FindFirstValue("SecurityStamp") is not string stamp ||
            Context.User?.FindFirstValue("MustChangePassword") == "True")
        { Context.Abort(); return; }
        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId, stamp));
        await base.OnConnectedAsync();
    }
}
