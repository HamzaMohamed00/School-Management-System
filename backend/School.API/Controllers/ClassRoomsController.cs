using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Features.ClassRooms.Commands;
using School.Application.Features.ClassRooms.Queries;

namespace School.API.Controllers;

[Authorize]
public class ClassRoomsController : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<List<ClassRoomDto>>> GetClassRooms()
    {
        var result = await Mediator.Send(new GetClassRoomsQuery());
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<int>> CreateClassRoom(CreateClassRoomCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateClassRoom(int id, UpdateClassRoomCommand command)
    {
        if (id != command.Id) return BadRequest();
        var result = await Mediator.Send(command);
        return result ? Ok() : NotFound();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteClassRoom(int id)
    {
        var result = await Mediator.Send(new DeleteClassRoomCommand { Id = id });
        return result ? Ok() : NotFound();
    }
}
