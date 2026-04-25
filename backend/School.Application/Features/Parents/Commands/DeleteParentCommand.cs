using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Parents.Commands;

public class DeleteParentCommand : IRequest<bool>
{
    public int Id { get; set; }
}

public class DeleteParentCommandHandler : IRequestHandler<DeleteParentCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public DeleteParentCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<bool> Handle(DeleteParentCommand request, CancellationToken cancellationToken)
    {
        var parent = await _unitOfWork.Repository<Parent>().GetByIdAsync(request.Id);
        if (parent == null) return false;

        // Unlink children
        var children = await _unitOfWork.Repository<Student>().ListAsync(new Specifications.BaseSpecification<Student>(s => s.ParentId == parent.Id));
        foreach (var child in children)
        {
            child.ParentId = null;
            _unitOfWork.Repository<Student>().Update(child);
        }

        // Delete user first
        await _authService.DeleteUserAsync(parent.UserId);

        _unitOfWork.Repository<Parent>().Delete(parent);
        var dbResult = await _unitOfWork.CompleteAsync();

        return dbResult > 0;
    }
}
