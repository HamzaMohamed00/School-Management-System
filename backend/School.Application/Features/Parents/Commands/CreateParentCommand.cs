using MediatR;
using School.Application.Interfaces;
using School.Domain.Entities;

namespace School.Application.Features.Parents.Commands;

public class CreateParentCommand : IRequest<int>
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Password { get; set; } = "Password@123";
}

public class CreateParentCommandHandler : IRequestHandler<CreateParentCommand, int>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuthService _authService;

    public CreateParentCommandHandler(IUnitOfWork unitOfWork, IAuthService authService)
    {
        _unitOfWork = unitOfWork;
        _authService = authService;
    }

    public async Task<int> Handle(CreateParentCommand request, CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterUserAsync(
            request.FullName,
            request.Email,
            request.Password,
            "Parent",
            request.Phone);

        if (!result.Succeeded) throw new Exception(string.Join(", ", result.Errors));

        var parent = new Parent
        {
            UserId = result.UserId,
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address
        };

        await _unitOfWork.Repository<Parent>().AddAsync(parent);
        await _unitOfWork.CompleteAsync();

        // 4. Link Identity User to Parent Profile
        await _authService.SetUserEntityLinkAsync(result.UserId, "Parent", parent.Id);

        return parent.Id;
    }
}
