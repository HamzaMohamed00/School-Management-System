using Microsoft.AspNetCore.SignalR;
using MediatR;
using School.Application.Features.Chat.Commands;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace School.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IMediator _mediator;

    public ChatHub(IMediator mediator)
    {
        _mediator = mediator;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        }

        await base.OnConnectedAsync();
    }

    public async Task SendMessage(string receiverId, string content)
    {
        var senderId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(senderId)) return;

        var command = new SendMessageCommand
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = content
        };

        var success = await _mediator.Send(command);

        if (success)
        {
            await Clients.Group(receiverId).SendAsync("ReceiveMessage", senderId, content);
            await Clients.Group(senderId).SendAsync("ReceiveMessage", senderId, content);
        }
    }

    public async Task SendNotification(string userId, string title, string content)
    {
        await Clients.Group(userId).SendAsync("ReceiveNotification", new { title, content, type = "General" });
    }
}
