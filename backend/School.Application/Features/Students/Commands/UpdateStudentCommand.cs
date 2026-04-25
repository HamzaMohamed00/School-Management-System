using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Students.Commands;

public class UpdateStudentCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public int? ClassRoomId { get; set; }
    public int? ParentId { get; set; }
}

public class UpdateStudentCommandHandler : IRequestHandler<UpdateStudentCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public UpdateStudentCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<bool> Handle(UpdateStudentCommand request, CancellationToken cancellationToken)
    {
        var student = await _unitOfWork.Repository<Student>().GetByIdAsync(request.Id);
        if (student == null) return false;

        // 1. Update Identity User
        var userUpdated = await _authService.UpdateUserAsync(student.UserId, request.FullName, request.Email, request.Phone);
        if (!userUpdated) return false;

        // 2. Update Student Profile
        student.FullName = request.FullName;
        student.Email = request.Email;
        student.Phone = request.Phone;
        student.ClassRoomId = request.ClassRoomId;
        student.ParentId = request.ParentId;

        _unitOfWork.Repository<Student>().Update(student);
        var result = await _unitOfWork.CompleteAsync();

        return result > 0;
    }
}
