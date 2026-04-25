using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Teachers.Commands;

public class UpdateTeacherCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public int? SubjectId { get; set; }
}

public class UpdateTeacherCommandHandler : IRequestHandler<UpdateTeacherCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public UpdateTeacherCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<bool> Handle(UpdateTeacherCommand request, CancellationToken cancellationToken)
    {
        var teacher = await _unitOfWork.Repository<Teacher>().GetByIdAsync(request.Id);
        if (teacher == null) return false;

        // 1. Update Identity User
        var userUpdated = await _authService.UpdateUserAsync(teacher.UserId, request.FullName, request.Email, request.Phone);
        if (!userUpdated) return false;

        // 2. Update Teacher Profile
        teacher.FullName = request.FullName;
        teacher.Email = request.Email;
        teacher.Phone = request.Phone;

        _unitOfWork.Repository<Teacher>().Update(teacher);
        await _unitOfWork.CompleteAsync();

        // 3. Handle Subject Reassignment
        // We clear existing associations IF the user selected a new subject or wants to change the current one
        // To keep it simple: if SubjectId is provided, we assign it.
        if (request.SubjectId.HasValue && request.SubjectId.Value > 0)
        {
            var subjectRepo = _unitOfWork.Repository<Subject>();
            
            // Optional: find and clear previous subjects if we only want one primary assignment from this screen
            var currentSubjects = await subjectRepo.ListAsync(new Specifications.BaseSpecification<Subject>(s => s.TeacherId == teacher.Id));
            foreach (var s in currentSubjects)
            {
                s.TeacherId = null;
                subjectRepo.Update(s);
            }

            var newSubject = await subjectRepo.GetByIdAsync(request.SubjectId.Value);
            if (newSubject != null)
            {
                newSubject.TeacherId = teacher.Id;
                subjectRepo.Update(newSubject);
            }
            await _unitOfWork.CompleteAsync();
        }

        return true;
    }
}
