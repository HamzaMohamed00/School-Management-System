using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Teachers.Queries;

public class GetTeacherByIdQuery : IRequest<TeacherDto>
{
    public int Id { get; set; }
}

public class GetTeacherByIdQueryHandler : IRequestHandler<GetTeacherByIdQuery, TeacherDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public GetTeacherByIdQueryHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<TeacherDto> Handle(GetTeacherByIdQuery request, CancellationToken cancellationToken)
    {
        var spec = new Specifications.BaseSpecification<Teacher>(t => t.Id == request.Id) { Includes = { t => t.Subjects, t => t.ClassRooms } };
        var teacher = await _unitOfWork.Repository<Teacher>().GetEntityWithSpec(spec);
        
        if (teacher == null) return null;

        var userId = teacher.UserId;
        if (string.IsNullOrEmpty(userId))
        {
            userId = await _authService.GetUserIdByEmailAsync(teacher.Email);
        }

        return new TeacherDto
        {
            Id = teacher.Id,
            UserId = userId,
            FullName = teacher.FullName,
            Email = teacher.Email,
            Phone = teacher.Phone,
            Subjects = teacher.Subjects?.Select(s => s.Name).ToList() ?? new(),
            ClassRooms = teacher.ClassRooms?.Select(c => c.Name).ToList() ?? new()
        };
    }
}
