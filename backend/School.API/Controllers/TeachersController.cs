using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Features.Teachers.Commands;
using School.Application.Features.Teachers.Queries;

namespace School.API.Controllers;

[Authorize]
public class TeachersController : BaseApiController
{
    [HttpGet("{id}")]
    public async Task<ActionResult<TeacherDto>> GetTeacher(int id)
    {
        var result = await Mediator.Send(new GetTeacherByIdQuery { Id = id });
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<List<TeacherDto>>> GetTeachers()
    {
        var result = await Mediator.Send(new GetTeachersQuery());
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<int>> CreateTeacher(CreateTeacherCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<bool>> UpdateTeacher(int id, UpdateTeacherCommand command)
    {
        if (id != command.Id) return BadRequest();
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<bool>> DeleteTeacher(int id)
    {
        var result = await Mediator.Send(new DeleteTeacherCommand { Id = id });
        if (!result) return NotFound(new { message = "فشل في حذف المدرس. تأكد من أن المدرس موجود." });
        return Ok(result);
    }
}
