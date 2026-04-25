using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace School.API.Controllers;

[Authorize]
public class GradeController : BaseApiController
{
    private readonly School.Infrastructure.Data.SchoolDbContext _context;
    private readonly ILogger<GradeController> _logger;

    public GradeController(School.Infrastructure.Data.SchoolDbContext context, ILogger<GradeController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("student")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyGrades()
    {
        var userEmail = User.FindFirstValue(System.Security.Claims.ClaimTypes.Email);
        var student = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
        if (student == null) return NotFound("Student profile not found. Please ensure your account is correctly linked.");
 
        var grades = await _context.GradeRecords
            .Include(g => g.Subject)
            .Where(g => g.StudentId == student.Id)
            .Select(g => new {
                g.Id,
                Value = g.Score,
                g.GradeType,
                g.Date,
                SubjectName = g.Subject == null ? "N/A" : g.Subject.Name,
                MaxScore = 100 // Standard
            })
            .OrderByDescending(g => g.Date)
            .ToListAsync();
 
        return Ok(grades);
    }

    [HttpGet("student/{studentId}")]
    [Authorize(Roles = "Admin,Teacher,Parent")]
    public async Task<IActionResult> GetStudentGrades(int studentId)
    {
        var grades = await _context.GradeRecords
            .Include(g => g.Subject)
            .Where(g => g.StudentId == studentId)
            .ToListAsync();

        return Ok(grades);
    }

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> UpsertGrade([FromBody] School.Domain.Entities.GradeRecord grade)
    {
        if (grade.Id == 0)
        {
            grade.Date = DateTime.UtcNow;
            _context.GradeRecords.Add(grade);
        }
        else
        {
            var existing = await _context.GradeRecords.FindAsync(grade.Id);
            if (existing == null) return NotFound();
            existing.Score = grade.Score;
            existing.Notes = grade.Notes;
            existing.Date = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(grade);
    }

    [HttpGet("teacher-setup")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetTeacherSetup()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.Email == userEmail);

        if (teacher == null) return NotFound();

        var subjects = await _context.Subjects
            .Where(s => s.TeacherId == teacher.Id)
            .Select(s => new { s.Name })
            .Distinct()
            .ToListAsync();

        var classes = await _context.ClassRooms
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();

        return Ok(new
        {
            subjects = subjects.Select(s => new { name = s.Name }),
            classes = classes
        });
    }

    [HttpGet("class-grades")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> GetClassGrades(int classId, string subjectName, string gradeType)
    {
        // Find a subject ID for this name in this class, or any class as fallback
        var subject = await _context.Subjects
            .FirstOrDefaultAsync(s => s.Name == subjectName && s.ClassRoomId == classId)
            ?? await _context.Subjects.FirstOrDefaultAsync(s => s.Name == subjectName);

        if (subject == null) return NotFound("Subject not found");

        var students = await _context.Students
            .Where(s => s.ClassRoomId == classId)
            .OrderBy(s => s.FullName)
            .ToListAsync();

        var existingGrades = await _context.GradeRecords
            .Where(g => g.SubjectId == subject.Id && g.GradeType == gradeType)
            .ToListAsync();

        var result = students.Select(s => {
            var grade = existingGrades.FirstOrDefault(g => g.StudentId == s.Id);
            return new {
                studentId = s.Id,
                studentName = s.FullName,
                gradeId = grade?.Id ?? 0,
                score = grade?.Score ?? 0,
                notes = grade?.Notes ?? ""
            };
        });

        return Ok(result);
    }

    [HttpPost("bulk-update")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> BulkUpdateGrades([FromBody] BulkGradeUpdateDto dto)
    {
        // Find subject ID
        var subject = await _context.Subjects
            .FirstOrDefaultAsync(s => s.Name == dto.SubjectName && s.ClassRoomId == dto.ClassId)
            ?? await _context.Subjects.FirstOrDefaultAsync(s => s.Name == dto.SubjectName);

        if (subject == null) return NotFound(new { success = false, message = "المادة غير موجودة." });

        // Verify ClassRoom exists
        var classRoom = await _context.ClassRooms.FindAsync(dto.ClassId);
        if (classRoom == null) return NotFound(new { success = false, message = "الفصل الدراسي غير موجود." });

        // Get student list for validation
        var validStudentIds = await _context.Students
            .Where(s => s.ClassRoomId == dto.ClassId)
            .Select(s => s.Id)
            .ToListAsync();

        foreach (var update in dto.Updates)
        {
            // Security Check: Does the student belong to the class?
            if (!validStudentIds.Contains(update.StudentId))
            {
                _logger.LogWarning("Security skip: Student {sid} not in class {cid}", update.StudentId, dto.ClassId);
                continue; 
            }

            if (update.GradeId > 0)
            {
                var existing = await _context.GradeRecords.FindAsync(update.GradeId);
                if (existing != null)
                {
                    existing.Score = update.Score;
                    existing.Notes = update.Notes;
                    existing.Date = DateTime.UtcNow;
                }
            }
            else
            {
                var newGrade = new School.Domain.Entities.GradeRecord
                {
                    StudentId = update.StudentId,
                    SubjectId = subject.Id,
                    GradeType = dto.GradeType,
                    Score = update.Score,
                    Notes = update.Notes,
                    Date = DateTime.UtcNow
                };
                _context.GradeRecords.Add(newGrade);
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

public class BulkGradeUpdateDto
{
    public string SubjectName { get; set; } = string.Empty;
    public int ClassId { get; set; }
    public string GradeType { get; set; } = string.Empty;
    public List<GradeUpdateItemDto> Updates { get; set; } = new();
}

public class GradeUpdateItemDto
{
    public int GradeId { get; set; }
    public int StudentId { get; set; }
    public double Score { get; set; }
    public string Notes { get; set; } = string.Empty;
}
