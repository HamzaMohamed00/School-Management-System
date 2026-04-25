using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Teachers.Queries;

public class GetTeachersQuery : IRequest<List<TeacherDto>>
{
}

public class TeacherDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? SubjectName { get; set; }
    public int? SubjectId { get; set; }
    public List<string> Subjects { get; set; } = new();
    public List<string> ClassRooms { get; set; } = new();
}

public class GetTeachersQueryHandler : IRequestHandler<GetTeachersQuery, List<TeacherDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public GetTeachersQueryHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<List<TeacherDto>> Handle(GetTeachersQuery request, CancellationToken cancellationToken)
    {
        var spec = new Specifications.BaseSpecification<Teacher>(null) { Includes = { t => t.Subjects, t => t.ClassRooms } };
        var teachers = await _unitOfWork.Repository<Teacher>().ListAsync(spec);
        var dtos = new List<TeacherDto>();

        foreach (var t in teachers)
        {
            var userId = t.UserId;
            if (string.IsNullOrEmpty(userId))
            {
                userId = await _authService.GetUserIdByEmailAsync(t.Email);
            }

            var primarySubject = t.Subjects?.FirstOrDefault();

            dtos.Add(new TeacherDto
            {
                Id = t.Id,
                UserId = userId,
                FullName = t.FullName,
                Email = t.Email,
                Phone = t.Phone,
                SubjectId = primarySubject?.Id,
                SubjectName = primarySubject?.Name,
                Subjects = t.Subjects?.Select(s => s.Name).ToList() ?? new(),
                ClassRooms = t.ClassRooms?.Select(c => c.Name).ToList() ?? new()
            });
        }

        return dtos;
    }
}
