using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Sessions.Commands;

public class CreateScheduledSessionCommand : IRequest<int>
{
    public string Title { get; set; }
    public int ClassRoomId { get; set; }
    public int SubjectId { get; set; }
    public int TeacherId { get; set; }
    public DateTime SessionDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string AttendanceType { get; set; } = "QR";
}

public class CreateScheduledSessionCommandHandler : IRequestHandler<CreateScheduledSessionCommand, int>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateScheduledSessionCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<int> Handle(CreateScheduledSessionCommand request, CancellationToken cancellationToken)
    {
        var session = new Session
        {
            Title = request.Title,
            SessionDate = request.SessionDate.Date,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            AttendanceType = request.AttendanceType,
            ClassRoomId = request.ClassRoomId,
            SubjectId = request.SubjectId,
            TeacherId = request.TeacherId
        };

        await _unitOfWork.Repository<Session>().AddAsync(session);
        await _unitOfWork.CompleteAsync();

        return session.Id;
    }
}
