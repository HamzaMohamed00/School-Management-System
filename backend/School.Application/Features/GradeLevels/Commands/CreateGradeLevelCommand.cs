using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.GradeLevels.Commands;

public class CreateGradeLevelCommand : IRequest<int>
{
    public string Name { get; set; } = string.Empty;
}

public class CreateGradeLevelCommandHandler : IRequestHandler<CreateGradeLevelCommand, int>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateGradeLevelCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<int> Handle(CreateGradeLevelCommand request, CancellationToken cancellationToken)
    {
        var gradeLevel = new GradeLevel
        {
            Name = request.Name
        };

        await _unitOfWork.Repository<GradeLevel>().AddAsync(gradeLevel);
        await _unitOfWork.CompleteAsync();

        return gradeLevel.Id;
    }
}
