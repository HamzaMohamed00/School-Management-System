using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace School.API.Controllers;

[Authorize]
public class AssignmentController : BaseApiController
{
    private readonly School.Infrastructure.Data.SchoolDbContext _context;

    public AssignmentController(School.Infrastructure.Data.SchoolDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAssignments()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var role = User.FindFirstValue(ClaimTypes.Role);

        if (role == "Student")
        {
            var student = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
            if (student == null) return NotFound();

            var assignments = await _context.Assignments
                .Include(a => a.Subject)
                .Include(a => a.Teacher)
                .Where(a => a.ClassRoomId == student.ClassRoomId)
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    a.Description,
                    SubjectName = a.Subject!.Name,
                    TeacherName = a.Teacher!.FullName,
                    a.DueDate,
                    a.AttachmentUrl,
                    IsSubmitted = _context.AssignmentSubmissions.Any(s => s.AssignmentId == a.Id && s.StudentId == student.Id)
                })
                .ToListAsync();

            return Ok(assignments);
        }
        else if (role == "Teacher")
        {
            var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.Email == userEmail);
            if (teacher == null) return NotFound();

            var assignments = await _context.Assignments
                .Include(a => a.Subject)
                .Include(a => a.ClassRoom)
                .Where(a => a.TeacherId == teacher.Id)
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    a.Description,
                    SubjectName = a.Subject!.Name,
                    ClassRoomName = a.ClassRoom!.Name,
                    a.DueDate,
                    SubmissionCount = a.Submissions.Count
                })
                .ToListAsync();

            return Ok(assignments);
        }

        return BadRequest("Invalid role");
    }

    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> CreateAssignment([FromBody] School.Domain.Entities.Assignment assignment)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.Email == userEmail);
        if (teacher == null) return Unauthorized();

        assignment.TeacherId = teacher.Id;
        _context.Assignments.Add(assignment);
        await _context.SaveChangesAsync();
        
        return Ok(assignment);
    }

    [HttpPost("submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> SubmitAssignment([FromBody] School.Domain.Entities.AssignmentSubmission submission)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var student = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
        if (student == null) return NotFound();

        submission.StudentId = student.Id;
        submission.SubmissionDate = DateTime.UtcNow;
        
        _context.AssignmentSubmissions.Add(submission);
        await _context.SaveChangesAsync();

        return Ok(submission);
    }

    [HttpGet("{id}/submissions")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetSubmissions(int id)
    {
        var submissions = await _context.AssignmentSubmissions
            .Include(s => s.Student)
            .Where(s => s.AssignmentId == id)
            .Select(s => new {
                s.Id,
                StudentName = s.Student!.FullName,
                s.SubmissionDate,
                s.FileUrl,
                s.StudentNotes,
                s.Grade,
                s.TeacherFeedback
            })
            .ToListAsync();

        return Ok(submissions);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> DeleteAssignment(int id)
    {
        var assignment = await _context.Assignments.FindAsync(id);
        if (assignment == null) return NotFound();

        // Remove related submissions first
        var submissions = _context.AssignmentSubmissions.Where(s => s.AssignmentId == id);
        _context.AssignmentSubmissions.RemoveRange(submissions);

        _context.Assignments.Remove(assignment);
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> UpdateAssignment(int id, [FromBody] School.Domain.Entities.Assignment assignment)
    {
        if (id != assignment.Id) return BadRequest();
        _context.Entry(assignment).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.Assignments.Any(e => e.Id == id)) return NotFound();
            throw;
        }
        return NoContent();
    }
}
