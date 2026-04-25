using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Features.Attendance.Commands;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using System.Security.Claims;

namespace School.API.Controllers;

[Authorize]
public class AttendanceController : BaseApiController
{
    private readonly IQrCodeService _qrCodeService;
    private readonly SchoolDbContext _context;
    private readonly IFaceRecognitionService _faceRecognition;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(IQrCodeService qrCodeService, SchoolDbContext context, IFaceRecognitionService faceRecognition, ILogger<AttendanceController> logger)
    {
        _qrCodeService = qrCodeService;
        _context = context;
        _faceRecognition = faceRecognition;
        _logger = logger;
    }

    [HttpPost("scan-qr")]
    public async Task<ActionResult<bool>> ScanQr(ScanQrCommand command)
    {
        // 1. If StudentId is not provided, get it from current logged in user
        if (command.StudentId == 0)
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email);
            var student = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
            if (student == null) return Unauthorized("Student not found.");
            command.StudentId = student.Id;
        }

        // 2. Decode the token to get the SessionId if missing
        try 
        {
            var decodedString = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(command.QrToken));
            var parts = decodedString.Split('|');
            var payloadParts = parts[0].Split(':');
            command.SessionId = int.Parse(payloadParts[0]);
        }
        catch 
        {
            return BadRequest("Invalid QR Code format.");
        }

        var result = await Mediator.Send(command);
        if (!result) return BadRequest("Invalid or expired QR token.");
        
        return Ok(result);
    }

    [HttpGet("generate-qr/{sessionId}")]
    [Authorize(Roles = "Teacher,Admin")]
    public ActionResult<string> GenerateQrToken(int sessionId)
    {
        var token = _qrCodeService.GenerateQrToken(sessionId);
        return Ok(new { Token = token });
    }

    [HttpGet("session/{sessionId}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult> GetSessionAttendance(int sessionId)
    {
        var records = await _context.Attendances
            .Include(a => a.Student)
            .Where(a => a.SessionId == sessionId)
            .Select(a => new
            {
                studentId = a.StudentId,
                studentName = a.Student.FullName,
                status = a.Status,
                recordedAt = a.RecordedAt
            })
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("student/{studentId}")]
    public async Task<ActionResult> GetStudentAttendance(int studentId)
    {
        var records = await _context.Attendances
            .Where(a => a.StudentId == studentId)
            .Include(a => a.Session)
            .Select(a => new
            {
                sessionId = a.SessionId,
                sessionName = a.Session != null ? a.Session.Title : "",
                status = a.Status,
                date = a.RecordedAt
            })
            .OrderByDescending(a => a.date)
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("student/{studentId}/stats")]
    public async Task<ActionResult> GetStudentStats(int studentId)
    {
        var total = await _context.Attendances.CountAsync(a => a.StudentId == studentId);
        var present = await _context.Attendances.CountAsync(a => a.StudentId == studentId && a.Status == "Present");
        var absent = await _context.Attendances.CountAsync(a => a.StudentId == studentId && a.Status == "Absent");
        var late = await _context.Attendances.CountAsync(a => a.StudentId == studentId && a.Status == "Late");

        return Ok(new { total, present, absent, late });
    }

    [HttpGet("student/me/stats")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult> GetMyStats()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var student = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
        if (student == null) return NotFound("Student not found");

        var total = await _context.Attendances.CountAsync(a => a.StudentId == student.Id);
        var present = await _context.Attendances.CountAsync(a => a.StudentId == student.Id && a.IsPresent);
        var absent = await _context.Attendances.CountAsync(a => a.StudentId == student.Id && !a.IsPresent);
        
        return Ok(new { total, present, absent, late = 0 });
    }

    [HttpPost("face/{sessionId}")]
    [Authorize(Roles = "Teacher,Admin,Student")]
    public async Task<ActionResult> FaceAttendance(int sessionId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, message = "لم يتم إرسال صورة" });

        // 1. Get the session info
        var session = await _context.Sessions.FindAsync(sessionId);
        if (session == null)
            return NotFound(new { success = false, message = "السكشن غير موجود" });

        // 2. Perform Face Recognition
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        // 0. Get the logged-in student
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var loggedStudent = await _context.Students.FirstOrDefaultAsync(s => s.Email == userEmail);
        if (loggedStudent == null)
            return Unauthorized(new { success = false, message = "لم يتم العثور على سجل لهذا الطالب." });

        int recognizedStudentId = 0;
        bool recognized = false;
        double confidence = 0;

        try 
        {
            var faceResult = await _faceRecognition.RecognizeFaceAsync(bytes, file.FileName);
            if (faceResult.Success)
            {
                recognizedStudentId = faceResult.StudentId;
                recognized = true;
                confidence = faceResult.Confidence;
                _logger.LogInformation("[FACELOG] Face recognized! StudentId: {id}, Confidence: {conf}", recognizedStudentId, faceResult.Confidence);
            }
            else
            {
                _logger.LogWarning("[FACELOG] Face NOT recognized by service.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FACELOG] Face Recognition Service Connection Failed.");
        }

        // 3. Fallback/Mock logic for testing if recognition fails or service is down
        if (!recognized)
        {
             // For DEMO purposes: If not recognized, we can try to find the student in the session who isn't present
             // but it's better to tell the user that "Recognition Failed"
             return Ok(new { success = false, message = "لم يتم التعرف على الوجه. يرجى المحاولة مرة أخرى أو التأكد من إضاءة المكان." });
        }

        // 4. Record Attendance with Strict Verification
        if (recognizedStudentId != loggedStudent.Id)
        {
             _logger.LogWarning("[FACELOG] Verification Failed! LoggedUser: {loggedId}, RecognizedAI: {aiId}", loggedStudent.Id, recognizedStudentId);
             
             // If we're extremely confident it's someone else, deny
             if (confidence > 0.60) {
                 return BadRequest(new { success = false, message = "فشل التحقق: الوجه المكتشف يخص طالب آخر، يرجى تسجيل الدخول بحسابك الصحيح." });
             }
             
             return BadRequest(new { success = false, message = "لم يتم التعرف على وجهك كصاحب لهذا الحساب. يرجى التأكد من الإضاءة." });
        }

        var student = loggedStudent; // Validated!

        // Check if already recorded
        var existing = await _context.Attendances
            .AnyAsync(a => a.SessionId == sessionId && a.StudentId == recognizedStudentId);

        if (existing)
             return Ok(new { success = true, alreadyPresent = true, studentName = student.FullName, message = "تم تسجيل حضورك مسبقاً" });

        var attendance = new School.Domain.Entities.Attendance
        {
            StudentId = student.Id,
            SessionId = sessionId,
            Status = "Present",
            IsPresent = true,
            Time = DateTime.UtcNow,
            RecordedAt = DateTime.UtcNow,
            Method = "Face",
            Notes = ""
        };

        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            recognized = true,
            studentName = student.FullName,
            studentId = student.Id,
            message = "تم تسجيل الحضور بنجاح"
        });
    }

    [HttpPost("manual")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult> ManualAttendance([FromBody] ManualAttendanceDto dto)
    {
        if (dto.Records == null || dto.Records.Count == 0)
            return BadRequest("لا توجد سجلات");

        foreach (var record in dto.Records)
        {
            var existing = await _context.Attendances
                .FirstOrDefaultAsync(a => a.StudentId == int.Parse(record.Id) && a.SessionId == 0);

            if (existing == null)
            {
                _context.Attendances.Add(new School.Domain.Entities.Attendance
                {
                    StudentId = int.Parse(record.Id),
                    SessionId = 0,
                    Status = record.IsPresent ? "Present" : "Absent",
                    RecordedAt = DateTime.UtcNow,
                    Method = "Manual"
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

public class ManualAttendanceDto
{
    public string ClassId { get; set; }
    public string SubjectId { get; set; }
    public List<ManualAttendanceRecordDto> Records { get; set; }
}

public class ManualAttendanceRecordDto
{
    public string Id { get; set; }
    public string Name { get; set; }
    public bool IsPresent { get; set; }
    public string Notes { get; set; }
}
