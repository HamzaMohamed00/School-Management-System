using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Features.Students.Commands;
using School.Application.Features.Students.Queries;

namespace School.API.Controllers;

[Authorize]
public class StudentsController : BaseApiController
{
    [HttpGet("{id}")]
    public async Task<ActionResult<StudentDto>> GetStudent(int id)
    {
        var result = await Mediator.Send(new GetStudentByIdQuery { Id = id });
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<List<StudentDto>>> GetStudents([FromQuery] int? classRoomId)
    {
        var query = new GetStudentsQuery { ClassRoomId = classRoomId };
        var result = await Mediator.Send(query);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<ActionResult<int>> CreateStudent(CreateStudentCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<ActionResult<bool>> UpdateStudent(int id, UpdateStudentCommand command)
    {
        if (id != command.Id) return BadRequest();
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<ActionResult<bool>> DeleteStudent(int id)
    {
        var result = await Mediator.Send(new DeleteStudentCommand { Id = id });
        if (!result) return NotFound(new { message = "فشل في حذف الطالب. تأكد من أن الطالب موجود." });
        return Ok(result);
    }
}
