using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.GradeLevels.Queries;

public class GetGradeLevelsQuery : IRequest<List<GradeLevelDto>>
{
}

public class GradeLevelDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int StudentCount { get; set; }
}

public class GetGradeLevelsQueryHandler : IRequestHandler<GetGradeLevelsQuery, List<GradeLevelDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetGradeLevelsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<GradeLevelDto>> Handle(GetGradeLevelsQuery request, CancellationToken cancellationToken)
    {
        var spec = new Specifications.BaseSpecification<GradeLevel>();
        spec.AddInclude("ClassRooms.Students");
        
        var grades = await _unitOfWork.Repository<GradeLevel>().ListAsync(spec);

        return grades.Select(g => new GradeLevelDto
        {
            Id = g.Id,
            Name = g.Name,
            StudentCount = g.ClassRooms.SelectMany(c => c.Students).Count()
        }).ToList();
    }
}
