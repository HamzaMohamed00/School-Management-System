using MediatR;
using School.Application.Interfaces;

namespace School.Application.Features.Account.Commands;

public class UpdateAvatarCommand : IRequest<string>
{
    public string UserId { get; set; }
    public string AvatarBase64 { get; set; }
}

public class UpdateAvatarCommandHandler : IRequestHandler<UpdateAvatarCommand, string>
{
    private readonly IAuthService _authService;

    public UpdateAvatarCommandHandler(IAuthService authService)
    {
        _authService = authService;
    }

    public async Task<string> Handle(UpdateAvatarCommand request, CancellationToken cancellationToken)
    {
        return await _authService.UpdateAvatarAsync(request.UserId, request.AvatarBase64);
    }
}
