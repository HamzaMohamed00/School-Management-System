using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Students.Commands;

public class CreateStudentCommand : IRequest<int>
{
    public string FullName { get; set; }
    public string Email { get; set; }
    public string Phone { get; set; }
    public string Password { get; set; }
    public int? ClassRoomId { get; set; }
    public int? ParentId { get; set; }
}

public class CreateStudentCommandHandler : IRequestHandler<CreateStudentCommand, int>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public CreateStudentCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<int> Handle(CreateStudentCommand request, CancellationToken cancellationToken)
    {
        // 1. Create Identity User via AuthService
        var result = await _authService.RegisterUserAsync(
            request.FullName, 
            request.Email, 
            request.Password ?? "Password123!", 
            "Student", 
            request.Phone);

        if (!result.Succeeded)
        {
            throw new Exception($"Failed to create user: {string.Join(", ", result.Errors)}");
        }

        // 3. Create Student Profile
        var student = new Student
        {
            UserId = result.UserId,
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            ClassRoomId = request.ClassRoomId,
            ParentId = request.ParentId,
            BirthDate = DateTime.UtcNow.AddYears(-10),
            QrCodeValue = Guid.NewGuid().ToString()
        };

        await _unitOfWork.Repository<Student>().AddAsync(student);
        await _unitOfWork.CompleteAsync();

        // 4. Link Identity User to Student Profile
        await _authService.SetUserEntityLinkAsync(result.UserId, "Student", student.Id);

        return student.Id;
    }
}
