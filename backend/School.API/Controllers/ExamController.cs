using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace School.API.Controllers;

[Authorize]
public class ExamController : BaseApiController
{
    private readonly School.Infrastructure.Data.SchoolDbContext _context;

    public ExamController(School.Infrastructure.Data.SchoolDbContext context)
    {
        _context = context;
    }

    [HttpGet("student")]
    public async Task<IActionResult> GetStudentExams()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var student = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
        if (student == null) return NotFound("Student not found");

        var exams = await _context.Exams
            .Include(e => e.Subject)
            .Include(e => e.Teacher)
            .Include(e => e.ClassRoom)
            .Where(e => e.ClassRoomId == student.ClassRoomId)
            .Select(e => new
            {
                id = e.Id,
                title = e.Title,
                description = e.Description,
                subjectName = e.Subject == null ? "N/A" : e.Subject.Name,
                teacherName = e.Teacher == null ? "N/A" : e.Teacher.FullName,
                classRoomName = e.ClassRoom == null ? "N/A" : e.ClassRoom.Name,
                startTime = e.StartTime,
                endTime = e.EndTime,
                maxScore = e.MaxScore,
                duration = (int)(e.EndTime - e.StartTime).TotalMinutes,
                questionCount = _context.Questions.Count(q => q.ExamId == e.Id),
                isCompleted = _context.ExamResults.Any(r => r.ExamId == e.Id && r.StudentId == student.Id)
            })
            .ToListAsync();

        return Ok(exams);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetExamDetails(int id)
    {
        var exam = await _context.Exams
            .Include(e => e.Subject)
            .Include(e => e.ClassRoom)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (exam == null) return NotFound();

        var questions = await _context.Questions
            .Include(q => q.Choices)
            .Where(q => q.ExamId == id)
            .Select(q => new {
                id = q.Id,
                text = q.Text,
                score = q.Score,
                marks = q.Score, // Compatibility with components expecting 'marks'
                choices = q.Choices.Select(c => new { id = c.Id, text = c.Text })
            })
            .ToListAsync();

        return Ok(new {
            exam.Id,
            exam.Title,
            exam.Description,
            exam.StartTime,
            exam.EndTime,
            exam.MaxScore,
            exam.ExamType,
            SubjectName = exam.Subject?.Name,
            ClassRoomName = exam.ClassRoom?.Name,
            Duration = (int)(exam.EndTime - exam.StartTime).TotalMinutes,
            questions
        });
    }

    [HttpPost("create")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> CreateExam([FromBody] School.Domain.Entities.Exam exam)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.Email == userEmail);
        if (teacher == null) return Unauthorized("لم يتم العثور على المعلم أو غير مصرح لك.");

        exam.TeacherId = teacher.Id;

        _context.Exams.Add(exam);
        await _context.SaveChangesAsync();
        return Ok(exam);
    }

    [HttpGet("teacher")]
    public async Task<IActionResult> GetTeacherExams()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.Email == userEmail);
        if (teacher == null) return NotFound();

        var exams = await _context.Exams
            .Include(e => e.Subject)
            .Include(e => e.ClassRoom)
            .Where(e => e.TeacherId == teacher.Id)
            .ToListAsync();

        return Ok(exams);
    }
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitExam(int id, [FromBody] ExamSubmission submission)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var student = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
        if (student == null) return NotFound("Student not found");

        var questions = await _context.Questions
            .Include(q => q.Choices)
            .Where(q => q.ExamId == id)
            .ToListAsync();

        int totalScore = 0;
        int earnedScore = 0;

        if (submission.Answers != null)
        {
            foreach (var q in questions)
            {
                totalScore += q.Score;
                var answer = submission.Answers.FirstOrDefault(a => a.QuestionId == q.Id);
                if (answer != null)
                {
                    var correctChoice = q.Choices.FirstOrDefault(c => c.IsCorrect);
                    if (correctChoice != null && correctChoice.Id == answer.ChoiceId)
                    {
                        earnedScore += q.Score;
                    }
                }
            }
        }

        var result = new School.Domain.Entities.ExamResult
        {
            ExamId = id,
            StudentId = student.Id,
            Score = earnedScore,
            Notes = $"تم الحل بنجاح. النتيجة: {earnedScore} من {totalScore}"
        };

        _context.ExamResults.Add(result);
        await _context.SaveChangesAsync();

        return Ok(new { earnedScore, totalScore, resultId = result.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> UpdateExam(int id, [FromBody] School.Domain.Entities.Exam updatedExam)
    {
        if (id != updatedExam.Id) return BadRequest("معرف الاختبار غير متطابق.");

        var existingExam = await _context.Exams
            .Include(e => e.Questions)
                .ThenInclude(q => q.Choices)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (existingExam == null) return NotFound("الاختبار غير موجود.");

        // Update fields safely without touching TeacherId
        existingExam.Title = updatedExam.Title;
        existingExam.Description = updatedExam.Description;
        existingExam.ClassRoomId = updatedExam.ClassRoomId;
        existingExam.SubjectId = updatedExam.SubjectId;
        existingExam.ExamType = updatedExam.ExamType;
        existingExam.StartTime = updatedExam.StartTime;
        existingExam.EndTime = updatedExam.EndTime;
        existingExam.MaxScore = updatedExam.MaxScore;
        
        // Fully replace questions
        if (updatedExam.Questions != null)
        {
            _context.Questions.RemoveRange(existingExam.Questions);
            
            foreach(var q in updatedExam.Questions)
            {
                q.Id = 0; // Let DB generate new IDs
                q.ExamId = existingExam.Id;
                if(q.Choices != null)
                {
                    foreach(var c in q.Choices)
                    {
                        c.Id = 0; // Let DB generate
                        c.QuestionId = 0;
                    }
                }
            }
            existingExam.Questions = updatedExam.Questions;
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception)
        {
            return StatusCode(500, "حدث خطأ أثناء حفظ التعديلات في قاعدة البيانات.");
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> DeleteExam(int id)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null) return NotFound();

        _context.Exams.Remove(exam);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("{id}/results")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> GetExamResults(int id)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null) return NotFound("الاختبار غير موجود");

        var results = await _context.ExamResults
            .Include(r => r.Student)
            .Where(r => r.ExamId == id)
            .Select(r => new {
                id = r.Id,
                studentName = r.Student != null ? r.Student.FullName : "غير محدد",
                score = r.Score,
                maxScore = exam.MaxScore,
                notes = r.Notes
            })
            .ToListAsync();

        return Ok(new {
            examTitle = exam.Title,
            maxScore = exam.MaxScore,
            results = results
        });
    }

    [HttpGet("{id}/student-result")]
    public async Task<IActionResult> GetStudentExamResult(int id)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var student = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
        if (student == null) return NotFound("Student not found");

        var result = await _context.ExamResults
            .Include(r => r.Exam)
            .Where(r => r.ExamId == id && r.StudentId == student.Id)
            .FirstOrDefaultAsync();

        if (result == null) return NotFound("النتيجة غير موجودة");

        return Ok(new {
            examTitle = result.Exam.Title,
            score = result.Score,
            maxScore = result.Exam.MaxScore,
            notes = result.Notes
        });
    }
}

public class ExamSubmission
{
    public List<AnswerDto>? Answers { get; set; }
}

public class AnswerDto
{
    public int QuestionId { get; set; }
    public int ChoiceId { get; set; }
}
