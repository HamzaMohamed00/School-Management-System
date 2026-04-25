using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Parents.Queries;

public class GetParentsQuery : IRequest<List<ParentDto>> { }

public class ParentDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public int ChildrenCount { get; set; }
    public List<Features.Students.Queries.StudentDto> Children { get; set; } = new();
}

public class GetParentsQueryHandler : IRequestHandler<GetParentsQuery, List<ParentDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public GetParentsQueryHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<List<ParentDto>> Handle(GetParentsQuery request, CancellationToken cancellationToken)
    {
        var spec = new Specifications.BaseSpecification<Parent>(null) { Includes = { p => p.Children } };
        spec.IncludeStrings.Add("Children.ClassRoom");
        var parents = await _unitOfWork.Repository<Parent>().ListAsync(spec);
        var dtos = new List<ParentDto>();

        foreach (var p in parents)
        {
            var userId = p.UserId;
            if (string.IsNullOrEmpty(userId))
            {
                userId = await _authService.GetUserIdByEmailAsync(p.Email);
            }

            dtos.Add(new ParentDto
            {
                Id = p.Id,
                UserId = userId,
                FullName = p.FullName,
                Email = p.Email,
                Phone = p.Phone,
                Address = p.Address,
                ChildrenCount = p.Children?.Count ?? 0,
                Children = p.Children?.Select(s => new Features.Students.Queries.StudentDto
                {
                    Id = s.Id,
                    UserId = s.UserId,
                    FullName = s.FullName,
                    Email = s.Email,
                    Phone = s.Phone,
                    ClassRoomId = s.ClassRoomId ?? 0,
                    QrCodeValue = s.QrCodeValue,
                    ClassRoom = s.ClassRoom != null ? new Features.Students.Queries.ClassRoomDto { Id = s.ClassRoom.Id, Name = s.ClassRoom.Name } : null
                }).ToList() ?? new()
            });
        }

        return dtos;
    }
}
