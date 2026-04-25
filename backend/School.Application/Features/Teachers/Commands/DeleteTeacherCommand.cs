using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Teachers.Commands;

public class DeleteTeacherCommand : IRequest<bool>
{
    public int Id { get; set; }
}

public class DeleteTeacherCommandHandler : IRequestHandler<DeleteTeacherCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public DeleteTeacherCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<bool> Handle(DeleteTeacherCommand request, CancellationToken cancellationToken)
    {
        var teacher = await _unitOfWork.Repository<Teacher>().GetByIdAsync(request.Id);
        if (teacher == null) return false;

        // 1. Manual Cleanup for items not handled by DB Cascade or linked to UserId
        
        // Announcements created by this teacher (string UserId match)
        var announcements = await _unitOfWork.Repository<Announcement>().ListAsync(new Specifications.BaseSpecification<Announcement>(a => a.CreatedBy == teacher.UserId));
        foreach (var ann in announcements) _unitOfWork.Repository<Announcement>().Delete(ann);

        // Messages (Sender or Receiver)
        var messages = await _unitOfWork.Repository<Message>().ListAsync(new Specifications.BaseSpecification<Message>(m => m.SenderId == teacher.UserId || m.ReceiverId == teacher.UserId));
        foreach (var msg in messages) _unitOfWork.Repository<Message>().Delete(msg);

        // Note: ClassRoom, Subject, Exam, Session, Assignment, and Video are now handled 
        // by SchoolDbContext (SetNull or Cascade) when teacher profile is deleted.

        // 1. Delete Identity User (Crucial: do this first to remove FKs pointing to Teacher profile)
        var userDeleted = await _authService.DeleteUserAsync(teacher.UserId);

        // 2. Delete Teacher Profile
        _unitOfWork.Repository<Teacher>().Delete(teacher);
        var dbResult = await _unitOfWork.CompleteAsync();

        return dbResult > 0;
    }
}
