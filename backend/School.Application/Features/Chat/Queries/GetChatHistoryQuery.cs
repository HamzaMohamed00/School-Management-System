using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Chat.Queries;

public class GetChatHistoryQuery : IRequest<List<MessageDto>>
{
    public string UserId1 { get; set; } = string.Empty;
    public string UserId2 { get; set; } = string.Empty;
}

public class MessagesByUsersSpecification : Specifications.BaseSpecification<Message>
{
    public MessagesByUsersSpecification(string userId1, string userId2)
        : base(m => (m.SenderId == userId1 && m.ReceiverId == userId2) ||
                    (m.SenderId == userId2 && m.ReceiverId == userId1))
    {
        AddOrderBy(m => m.SentAt);
    }
}

public class MessageDto
{
    public string SenderId { get; set; } = string.Empty;
    public string ReceiverId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public bool IsRead { get; set; }
}

public class GetChatHistoryQueryHandler : IRequestHandler<GetChatHistoryQuery, List<MessageDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetChatHistoryQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<MessageDto>> Handle(GetChatHistoryQuery request, CancellationToken cancellationToken)
    {
        var spec = new MessagesByUsersSpecification(request.UserId1, request.UserId2);

        var messages = await _unitOfWork.Repository<Message>().ListAsync(spec);

        return messages.Select(m => new MessageDto
        {
            SenderId = m.SenderId,
            ReceiverId = m.ReceiverId,
            Content = m.Content,
            SentAt = m.SentAt,
            IsRead = m.IsRead
        }).ToList();
    }
}
