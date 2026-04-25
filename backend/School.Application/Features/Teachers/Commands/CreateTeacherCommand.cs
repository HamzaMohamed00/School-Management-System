using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Teachers.Commands;

public class CreateTeacherCommand : IRequest<int>
{
    public string FullName { get; set; }
    public string Email { get; set; }
    public string Phone { get; set; }
    public string Password { get; set; }
    public int? SubjectId { get; set; }
}

public class CreateTeacherCommandHandler : IRequestHandler<CreateTeacherCommand, int>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public CreateTeacherCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<int> Handle(CreateTeacherCommand request, CancellationToken cancellationToken)
    {
        // 1. Create Identity User via AuthService
        var result = await _authService.RegisterUserAsync(
            request.FullName, 
            request.Email, 
            request.Password ?? "Password123!", 
            "Teacher", 
            request.Phone);

        if (!result.Succeeded)
        {
            throw new Exception($"Failed to create user: {string.Join(", ", result.Errors)}");
        }

        // 3. Create Teacher Profile
        var teacher = new Teacher
        {
            UserId = result.UserId,
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone
        };

        await _unitOfWork.Repository<Teacher>().AddAsync(teacher);
        await _unitOfWork.CompleteAsync();

        // 4. Link Identity User to Teacher Profile
        await _authService.SetUserEntityLinkAsync(result.UserId, "Teacher", teacher.Id);

        // 5. Assign Subject if provided
        if (request.SubjectId.HasValue && request.SubjectId.Value > 0)
        {
            var subject = await _unitOfWork.Repository<Subject>().GetByIdAsync(request.SubjectId.Value);
            if (subject != null)
            {
                subject.TeacherId = teacher.Id;
                _unitOfWork.Repository<Subject>().Update(subject);
                await _unitOfWork.CompleteAsync();
            }
        }

        return teacher.Id;
    }
}
