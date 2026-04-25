using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Features.Subjects.Commands;
using School.Application.Features.Subjects.Queries;

using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;
using System.Security.Claims;

namespace School.API.Controllers;

[Authorize]
public class SubjectsController : BaseApiController
{
    private readonly SchoolDbContext _context;

    public SubjectsController(SchoolDbContext context)
    {
        _context = context;
    }
    [HttpGet]
    public async Task<ActionResult<List<SubjectDto>>> GetSubjects()
    {
        var result = await Mediator.Send(new GetSubjectsQuery());
        return Ok(result);
    }

    [HttpGet("my-subjects")]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<List<SubjectDto>>> GetMySubjects()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        
        var subjects = await _context.Subjects
            .Include(s => s.Teacher)
            .Where(s => s.Teacher != null && s.Teacher.Email == userEmail)
            .Select(s => new SubjectDto
            {
                Id = s.Id,
                Name = s.Name,
                Code = s.Code,
                Description = s.Description,
                CreditHours = s.CreditHours,
                TeacherId = s.TeacherId,
                TeacherName = s.Teacher == null ? "N/A" : s.Teacher.FullName
            })
            .ToListAsync();

        return Ok(subjects);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<int>> CreateSubject(CreateSubjectCommand command)
    {
        try
        {
            var result = await Mediator.Send(command);
            return Ok(result);
        }
        catch (Exception ex)
        {
            var fullMessage = ex.Message;
            if (ex.InnerException != null)
            {
                fullMessage += " | التفاصيل: " + ex.InnerException.Message;
            }
            return StatusCode(500, new { message = "خطأ في إضافة المادة: " + fullMessage });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateSubject(int id, UpdateSubjectCommand command)
    {
        if (id != command.Id) return BadRequest();
        var result = await Mediator.Send(command);
        return result ? Ok() : NotFound();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteSubject(int id)
    {
        try
        {
            var result = await Mediator.Send(new DeleteSubjectCommand { Id = id });
            if (!result) return NotFound(new { message = "المادة غير موجودة" });
            return Ok(new { message = "تم حذف المادة بنجاح" });
        }
        catch (Exception ex)
        {
            var errorMessage = ex.Message;
            var inner = ex.InnerException;
            while (inner != null)
            {
                errorMessage += " -> " + inner.Message;
                inner = inner.InnerException;
            }
            return StatusCode(500, new { message = "فشل حذف المادة بسبب قيود في قاعدة البيانات: " + errorMessage });
        }
    }
}
