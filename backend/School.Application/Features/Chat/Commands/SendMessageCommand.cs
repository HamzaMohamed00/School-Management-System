using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Chat.Commands;

public class SendMessageCommand : IRequest<bool>
{
    public string SenderId { get; set; }
    public string ReceiverId { get; set; }
    public string Content { get; set; }
}

public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;

    public SendMessageCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var message = new Message
        {
            SenderId = request.SenderId,
            ReceiverId = request.ReceiverId,
            Content = request.Content,
            SentAt = DateTime.UtcNow,
            IsRead = false
        };

        await _unitOfWork.Repository<Message>().AddAsync(message);
        return await _unitOfWork.CompleteAsync() > 0;
    }
}
