using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Features.Parents.Commands;
using School.Application.Features.Parents.Queries;

namespace School.API.Controllers;

[Authorize]
public class ParentsController : BaseApiController
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<ParentDto>>> GetParents()
    {
        var result = await Mediator.Send(new GetParentsQuery());
        return Ok(result);
    }

    [HttpGet("profile-data")]
    [Authorize(Roles = "Admin,Parent")]
    public async Task<ActionResult<ParentDto>> GetParentProfile()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var parents = await Mediator.Send(new GetParentsQuery());
        var parent = parents.FirstOrDefault(p => p.UserId == userId);

        if (parent == null) return NotFound();
        return Ok(parent);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<int>> CreateParent(CreateParentCommand command)
    {
        try
        {
            var result = await Mediator.Send(command);
            return Ok(result);
        }
        catch (Exception ex)
        {
            // Logging would go here, but for now we return the error to catch the cause
            return StatusCode(500, new { message = "Backend Error", details = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<bool>> UpdateParent(int id, UpdateParentCommand command)
    {
        if (id != command.Id) return BadRequest();
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<bool>> DeleteParent(int id)
    {
        var result = await Mediator.Send(new DeleteParentCommand { Id = id });
        return result ? Ok() : NotFound();
    }

    [HttpPost("link-children")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<bool>> LinkStudents(LinkStudentsToParentCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }
}
