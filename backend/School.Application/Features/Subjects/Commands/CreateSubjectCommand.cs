using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Subjects.Commands;

public class CreateSubjectCommand : IRequest<int>
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CreditHours { get; set; }
    public int? TeacherId { get; set; }
    public int? ClassRoomId { get; set; }
}

public class CreateSubjectCommandHandler : IRequestHandler<CreateSubjectCommand, int>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateSubjectCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<int> Handle(CreateSubjectCommand request, CancellationToken cancellationToken)
    {
        var subject = new Subject
        {
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            CreditHours = request.CreditHours,
            TeacherId = request.TeacherId,
            ClassRoomId = request.ClassRoomId
        };

        await _unitOfWork.Repository<Subject>().AddAsync(subject);
        await _unitOfWork.CompleteAsync();

        return subject.Id;
    }
}
