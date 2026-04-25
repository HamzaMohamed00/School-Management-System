using MediatR;
using Microsoft.AspNetCore.Mvc;
using School.Application.Features.Account.Commands;
using Microsoft.AspNetCore.Identity;

namespace School.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly RoleManager<IdentityRole> _roleManager;

    public AccountController(IMediator mediator, RoleManager<IdentityRole> roleManager)
    {
        _mediator = mediator;
        _roleManager = roleManager;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginCommand command)
    {
        Console.WriteLine($"[CONTROLLER] Login start for: {command.Email}");
        var token = await _mediator.Send(command);
        if (token == null) 
        {
            Console.WriteLine($"[CONTROLLER] Login failed - token is null for: {command.Email}");
            return Unauthorized();
        }
        Console.WriteLine($"[CONTROLLER] Login success - returning token for: {command.Email}");
        return Ok(new { token });
    }

    [HttpPost("create-roles")]
    public async Task<IActionResult> CreateRoles()
    {
        string[] roles = { "Admin", "Teacher", "Student", "Parent" };
        foreach (var role in roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new IdentityRole(role));
            }
        }
        return Ok();
    }

    [HttpPost("add-admin")]
    public async Task<IActionResult> AddAdmin(RegisterAdminCommand command)
    {
        var result = await _mediator.Send(command);
        if (result) return Ok();
        return BadRequest();
    }

    [HttpPost("update-avatar")]
    public async Task<IActionResult> UpdateAvatar([FromBody] string avatarBase64)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var avatarUrl = await _mediator.Send(new UpdateAvatarCommand { UserId = userId, AvatarBase64 = avatarBase64 });
        if (avatarUrl != null) return Ok(new { avatarUrl });
        
        return BadRequest("Failed to update avatar");
    }
}
