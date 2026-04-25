using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;
using School.Application.Specifications;

namespace School.Application.Features.Students.Queries;

public class GetStudentsQuery : IRequest<List<StudentDto>>
{
    public int? ClassRoomId { get; set; }
}

public class StudentDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public int ClassRoomId { get; set; }
    public string QrCodeValue { get; set; } = string.Empty;
    
    public ClassRoomDto? ClassRoom { get; set; }
    public ParentDto? Parent { get; set; }
}

public class ClassRoomDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class ParentDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
}

public class GetStudentsQueryHandler : IRequestHandler<GetStudentsQuery, List<StudentDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public GetStudentsQueryHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<List<StudentDto>> Handle(GetStudentsQuery request, CancellationToken cancellationToken)
    {
        var spec = new BaseSpecification<Student>(_ => true);
        spec.Includes.Add(s => s.ClassRoom!);
        spec.Includes.Add(s => s.Parent!);
        
        if (request.ClassRoomId.HasValue)
        {
            spec = new BaseSpecification<Student>(s => s.ClassRoomId == request.ClassRoomId);
            spec.Includes.Add(s => s.ClassRoom!);
            spec.Includes.Add(s => s.Parent!);
        }

        var students = await _unitOfWork.Repository<Student>().ListAsync(spec);
        var dtos = new List<StudentDto>();

        foreach (var s in students)
        {
            var userId = s.UserId;
            if (string.IsNullOrEmpty(userId))
            {
                userId = await _authService.GetUserIdByEmailAsync(s.Email);
            }

            dtos.Add(new StudentDto
            {
                Id = s.Id,
                UserId = userId,
                FullName = s.FullName,
                Email = s.Email,
                Phone = s.Phone,
                ClassRoomId = s.ClassRoomId.GetValueOrDefault(),
                QrCodeValue = s.QrCodeValue,
                ClassRoom = s.ClassRoom != null ? new ClassRoomDto { Id = s.ClassRoom.Id, Name = s.ClassRoom.Name } : null,
                Parent = s.Parent != null ? new ParentDto { Id = s.Parent.Id, FullName = s.Parent.FullName } : null
            });
        }

        return dtos;
    }
}
