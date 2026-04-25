using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Subjects.Commands;

public class UpdateSubjectCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CreditHours { get; set; }
}

public class UpdateSubjectCommandHandler : IRequestHandler<UpdateSubjectCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateSubjectCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(UpdateSubjectCommand request, CancellationToken cancellationToken)
    {
        var subject = await _unitOfWork.Repository<Subject>().GetByIdAsync(request.Id);
        if (subject == null) return false;

        subject.Name = request.Name;
        subject.Code = request.Code;
        subject.Description = request.Description;
        subject.CreditHours = request.CreditHours;

        _unitOfWork.Repository<Subject>().Update(subject);
        var result = await _unitOfWork.CompleteAsync();
        return result > 0;
    }
}
