using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;
using School.Application.Specifications;

namespace School.Application.Features.Students.Queries;

public class GetStudentByIdQuery : IRequest<StudentDto>
{
    public int Id { get; set; }
}

public class GetStudentByIdQueryHandler : IRequestHandler<GetStudentByIdQuery, StudentDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public GetStudentByIdQueryHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<StudentDto> Handle(GetStudentByIdQuery request, CancellationToken cancellationToken)
    {
        var spec = new BaseSpecification<Student>(s => s.Id == request.Id);
        spec.Includes.Add(s => s.ClassRoom!);
        spec.Includes.Add(s => s.Parent!);
        
        var student = await _unitOfWork.Repository<Student>().GetEntityWithSpec(spec);
        
        if (student == null) return null;

        var userId = student.UserId;
        if (string.IsNullOrEmpty(userId))
        {
            userId = await _authService.GetUserIdByEmailAsync(student.Email);
        }

        return new StudentDto
        {
            Id = student.Id,
            UserId = userId,
            FullName = student.FullName,
            Email = student.Email,
            Phone = student.Phone,
            ClassRoomId = student.ClassRoomId.GetValueOrDefault(),
            QrCodeValue = student.QrCodeValue,
            ClassRoom = student.ClassRoom != null ? new ClassRoomDto { Id = student.ClassRoom.Id, Name = student.ClassRoom.Name } : null,
            Parent = student.Parent != null ? new ParentDto { Id = student.Parent.Id, FullName = student.Parent.FullName } : null
        };
    }
}
