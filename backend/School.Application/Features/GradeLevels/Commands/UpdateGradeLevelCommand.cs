using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.GradeLevels.Commands;

public class UpdateGradeLevelCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class UpdateGradeLevelCommandHandler : IRequestHandler<UpdateGradeLevelCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateGradeLevelCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(UpdateGradeLevelCommand request, CancellationToken cancellationToken)
    {
        var gradeLevel = await _unitOfWork.Repository<GradeLevel>().GetByIdAsync(request.Id);
        if (gradeLevel == null) return false;

        gradeLevel.Name = request.Name;

        _unitOfWork.Repository<GradeLevel>().Update(gradeLevel);
        var result = await _unitOfWork.CompleteAsync();
        return result > 0;
    }
}
