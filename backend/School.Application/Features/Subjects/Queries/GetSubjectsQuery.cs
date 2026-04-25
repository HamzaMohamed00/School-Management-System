using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Subjects.Queries;

public class GetSubjectsQuery : IRequest<List<SubjectDto>>
{
}

public class SubjectDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int? TeacherId { get; set; }
    public int? ClassRoomId { get; set; }
    public int CreditHours { get; set; }
    public string? TeacherName { get; set; }
}

public class GetSubjectsQueryHandler : IRequestHandler<GetSubjectsQuery, List<SubjectDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetSubjectsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<SubjectDto>> Handle(GetSubjectsQuery request, CancellationToken cancellationToken)
    {
        var subjects = await _unitOfWork.Repository<Subject>().ListAllAsync();

        return subjects.Select(s => new SubjectDto
        {
            Id = s.Id,
            Name = s.Name,
            Code = s.Code,
            Description = s.Description,
            TeacherId = s.TeacherId,
            ClassRoomId = s.ClassRoomId,
            CreditHours = s.CreditHours,
            TeacherName = s.Teacher?.FullName
        }).ToList();
    }
}
