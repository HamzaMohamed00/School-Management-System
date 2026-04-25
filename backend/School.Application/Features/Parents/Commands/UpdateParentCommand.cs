using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Parents.Commands;

public class UpdateParentCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
}

public class UpdateParentCommandHandler : IRequestHandler<UpdateParentCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public UpdateParentCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<bool> Handle(UpdateParentCommand request, CancellationToken cancellationToken)
    {
        var parent = await _unitOfWork.Repository<Parent>().GetByIdAsync(request.Id);
        if (parent == null) return false;

        await _authService.UpdateUserAsync(parent.UserId, request.FullName, request.Email, request.Phone);

        parent.FullName = request.FullName;
        parent.Email = request.Email;
        parent.Phone = request.Phone;
        parent.Address = request.Address;

        _unitOfWork.Repository<Parent>().Update(parent);
        var result = await _unitOfWork.CompleteAsync();

        return result > 0;
    }
}
