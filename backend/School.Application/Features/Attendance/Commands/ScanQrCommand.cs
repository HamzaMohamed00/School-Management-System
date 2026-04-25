using MediatR;
using School.Application.Interfaces;
using School.Application.Specifications;
using School.Application.Features.Sessions.Commands;
using School.Domain.Entities;

using AttendanceEntity = School.Domain.Entities.Attendance;

namespace School.Application.Features.Attendance.Commands;

public class ScanQrCommand : IRequest<bool>
{
    public string QrToken { get; set; }
    public int SessionId { get; set; }
    public int StudentId { get; set; }
}

public class ScanQrCommandHandler : IRequestHandler<ScanQrCommand, bool>
{
    private readonly IQrCodeService _qrCodeService;
    private readonly ICacheService _cacheService;
    private readonly IRepository<Session> _sessionRepo;
    private readonly IRepository<Student> _studentRepo;
    private readonly IRepository<AttendanceEntity> _attendanceRepo;

    public ScanQrCommandHandler(
        IQrCodeService qrCodeService, 
        ICacheService cacheService, 
        IRepository<Session> sessionRepo, 
        IRepository<Student> studentRepo,
        IRepository<AttendanceEntity> attendanceRepo)
    {
        _qrCodeService = qrCodeService;
        _cacheService = cacheService;
        _sessionRepo = sessionRepo;
        _studentRepo = studentRepo;
        _attendanceRepo = attendanceRepo;
    }

    public async Task<bool> Handle(ScanQrCommand request, CancellationToken cancellationToken)
    {
        var isValid = _qrCodeService.ValidateQrToken(request.QrToken, request.SessionId);
        if (!isValid) return false;

        var attendanceKey = $"session:{request.SessionId}:attendance";
        var attendanceRecords = await _cacheService.GetAsync<List<SessionAttendanceDto>>(attendanceKey);

        if (attendanceRecords == null)
        {
            var session = await _sessionRepo.GetByIdAsync(request.SessionId);
            if (session == null) return false;

            var spec = new BaseSpecification<Student>(s => s.ClassRoomId == (session.ClassRoomId ?? 0));
            var students = await _studentRepo.ListAsync(spec);

            attendanceRecords = students.Select(s => new SessionAttendanceDto 
            { 
                StudentId = s.Id, 
                IsPresent = false 
            }).ToList();
        }

        var studentRecord = attendanceRecords.FirstOrDefault(x => x.StudentId == request.StudentId);
        if (studentRecord == null) return false;

        studentRecord.IsPresent = true;
        studentRecord.Time = DateTime.UtcNow;

        await _cacheService.SetAsync(attendanceKey, attendanceRecords, TimeSpan.FromHours(4));

        var attendanceSpec = new BaseSpecification<AttendanceEntity>(
            a => a.SessionId == request.SessionId && a.StudentId == request.StudentId
        );

        var existingAttendanceList = await _attendanceRepo.ListAsync(attendanceSpec);
        var existingAttendance = existingAttendanceList.FirstOrDefault();

        if (existingAttendance == null)
        {
            await _attendanceRepo.AddAsync(new AttendanceEntity
            {
                StudentId = request.StudentId,
                SessionId = request.SessionId,
                IsPresent = true,
                Status = "Present",
                Method = "QR",
                Time = DateTime.UtcNow,
                RecordedAt = DateTime.UtcNow
            });
        }

        return true;
    }
}