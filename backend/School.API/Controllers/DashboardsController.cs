using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;
using School.Infrastructure.Identity;
using System.Security.Claims;

namespace School.API.Controllers;

[Authorize]
public class DashboardsController : BaseApiController
{
    private readonly SchoolDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public DashboardsController(SchoolDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<object>> GetAdminDashboard()
    {
        var totalStudents = await _context.Students.CountAsync();
        var totalTeachers = await _context.Teachers.CountAsync();
        var totalClasses = await _context.ClassRooms.CountAsync();
        
        var totalAttendances = await _context.Attendances.CountAsync();
        var presentAttendances = await _context.Attendances.CountAsync(a => a.IsPresent);
        
        double attendanceRate = totalAttendances > 0 
            ? Math.Round((double)presentAttendances / totalAttendances * 100, 1) 
            : 0;

        var recentStudents = await _context.Students
            .Include(s => s.ClassRoom)
            .Include(s => s.Parent)
            .OrderByDescending(s => s.Id)
            .Take(5)
            .Select(s => new {
                s.Id,
                s.FullName,
                s.Email,
                ClassRoomName = s.ClassRoom != null ? s.ClassRoom.Name : "N/A",
                ParentName = s.Parent != null ? s.Parent.FullName : "N/A"
            })
            .ToListAsync();

        return Ok(new
        {
            totalStudents,
            totalTeachers,
            totalClasses,
            attendanceRate = $"{attendanceRate}%",
            recentStudents
        });
    }

    [HttpGet("teacher")]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<object>> GetTeacherDashboard()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var teacher = await _context.Teachers
            .Include(t => t.ClassRooms)
            .FirstOrDefaultAsync(t => t.Email == userEmail);

        if (teacher == null) return NotFound("Teacher not found");

        var classIds = teacher.ClassRooms.Select(c => c.Id).ToList();
        var studentsInClasses = await _context.Students.CountAsync(s => s.ClassRoomId != null && classIds.Contains(s.ClassRoomId.Value));
        
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);
        
        var todaySessions = await _context.Sessions
            .Include(s => s.ClassRoom)
            .Include(s => s.Subject)
            .Where(s => s.ClassRoomId.HasValue && classIds.Contains(s.ClassRoomId.Value) && s.SessionDate >= today && s.SessionDate < tomorrow)
            .OrderBy(s => s.StartTime)
            .Select(s => new {
                s.Id,
                s.Title,
                SubjectName = s.Subject.Name,
                ClassRoomName = s.ClassRoom.Name,
                StartTime = s.SessionDate.Add(s.StartTime),
                EndTime = s.SessionDate.Add(s.EndTime),
                Type = s.AttendanceType,
                s.IsLive
            })
            .ToListAsync();

        var totalAttendances = await _context.Attendances
            .Include(a => a.Session)
            .CountAsync(a => a.Session.ClassRoomId.HasValue && classIds.Contains(a.Session.ClassRoomId.Value));
            
        var presentAttendances = await _context.Attendances
            .Include(a => a.Session)
            .CountAsync(a => a.Session.ClassRoomId.HasValue && classIds.Contains(a.Session.ClassRoomId.Value) && a.IsPresent);
            
        double attendanceRate = totalAttendances > 0 
            ? Math.Round((double)presentAttendances / totalAttendances * 100, 1) 
            : 0;

        return Ok(new
        {
            totalStudents = studentsInClasses,
            todayClasses = todaySessions.Count,
            attendanceAvg = $"{attendanceRate}%",
            todaySessions
        });
    }

    [HttpGet("student")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<object>> GetStudentDashboard()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var student = await _context.Students
            .Include(s => s.ClassRoom)
            .FirstOrDefaultAsync(s => s.Email == userEmail);

        if (student == null) return NotFound("Student not found");

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        var nextSession = await _context.Sessions
            .Include(s => s.Subject)
            .Where(s => s.ClassRoomId == student.ClassRoomId && (s.SessionDate > today || (s.SessionDate == today && s.StartTime >= DateTime.Now.TimeOfDay)))
            .OrderBy(s => s.SessionDate).ThenBy(s => s.StartTime)
            .Select(s => new {
                s.Id,
                s.Title,
                SubjectName = s.Subject.Name,
                StartTime = s.SessionDate.Add(s.StartTime),
                EndTime = s.SessionDate.Add(s.EndTime),
                Type = s.AttendanceType,
                s.IsLive
            })
            .FirstOrDefaultAsync();

        var totalAttendances = await _context.Attendances.CountAsync(a => a.StudentId == student.Id);
        var presentAttendances = await _context.Attendances.CountAsync(a => a.StudentId == student.Id && a.IsPresent);
        
        double attendanceRate = totalAttendances > 0 
            ? Math.Round((double)presentAttendances / totalAttendances * 100, 1) 
            : 0;

        var upcomingExams = await _context.Exams
            .Include(e => e.Subject)
            .Where(e => e.ClassRoomId == student.ClassRoomId)
            .OrderByDescending(e => e.StartTime)
            .Take(3)
            .Select(e => new {
                e.Id,
                e.Title,
                SubjectName = e.Subject.Name,
                Date = e.StartTime,
                DurationMinutes = (int)(e.EndTime - e.StartTime).TotalMinutes,
                Type = "Exam"
            })
            .ToListAsync();

        var upcomingAssignments = await _context.Assignments
            .Include(a => a.Subject)
            .Where(a => a.ClassRoomId == student.ClassRoomId)
            .OrderByDescending(a => a.DueDate)
            .Take(3)
            .Select(a => new {
                a.Id,
                a.Title,
                SubjectName = a.Subject!.Name,
                Date = a.DueDate,
                DurationMinutes = 0,
                Type = "Assignment"
            })
            .ToListAsync();

        var recentGrades = await _context.GradeRecords
            .Include(g => g.Subject)
            .Where(g => g.StudentId == student.Id)
            .OrderByDescending(g => g.Date)
            .Take(4)
            .Select(g => new {
                Subject = g.Subject.Name,
                Score = g.Score,
                MaxScore = 100 // Default max score
            })
            .ToListAsync();

        var todaySessions = await _context.Sessions
            .Include(s => s.Subject)
            .Include(s => s.Teacher)
            .Where(s => s.ClassRoomId == student.ClassRoomId && s.SessionDate == today)
            .OrderBy(s => s.StartTime)
            .Select(s => new {
                s.Id,
                Subject = s.Subject.Name,
                TeacherName = s.Teacher.FullName,
                StartTime = s.StartTime.ToString(@"hh\:mm"),
                EndTime = s.EndTime.ToString(@"hh\:mm"),
                Completed = s.SessionDate.Add(s.EndTime) < DateTime.Now,
                IsLive = s.IsLive
            })
            .ToListAsync();

        return Ok(new
        {
            attendanceRate = $"{attendanceRate}%",
            nextSession,
            upcomingExams,
            upcomingAssignments,
            upcomingAssignmentsCount = upcomingAssignments.Count,
            className = student.ClassRoom?.Name ?? "N/A",
            gradeLevel = student.ClassRoom?.GradeLevel?.Name ?? "N/A",
            todaySessions,
            recentGrades
        });
    }

    [HttpGet("parent")]
    [Authorize(Roles = "Parent")]
    public async Task<ActionResult<object>> GetParentDashboard()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var parent = await _context.Parents
            .Include(p => p.Children)
                .ThenInclude(c => c.ClassRoom)
                    .ThenInclude(cr => cr!.GradeLevel)
            .FirstOrDefaultAsync(p => p.Email == userEmail);

        if (parent == null) return NotFound("Parent not found");

        var childrenData = new List<object>();

        foreach (var child in parent.Children)
        {
            var totalAttendances = await _context.Attendances.CountAsync(a => a.StudentId == child.Id);
            var presentAttendances = await _context.Attendances.CountAsync(a => a.StudentId == child.Id && a.IsPresent);
            var absences = await _context.Attendances.CountAsync(a => a.StudentId == child.Id && !a.IsPresent);
            
            double attendanceRate = totalAttendances > 0 
                ? Math.Round((double)presentAttendances / totalAttendances * 100, 1) 
                : 100;

            var grades = await _context.GradeRecords
                .Include(g => g.Subject)
                .Where(g => g.StudentId == child.Id)
                .ToListAsync();

            double average = grades.Any() ? Math.Round(grades.Average(g => g.Score), 1) : 0;

            childrenData.Add(new {
                child.Id,
                child.FullName,
                Avatar = (string?)null,
                ClassRoomName = child.ClassRoom != null ? child.ClassRoom.Name : "N/A",
                GradeLevel = child.ClassRoom != null && child.ClassRoom.GradeLevel != null ? child.ClassRoom.GradeLevel.Name : "N/A",
                attendanceRate = attendanceRate.ToString(),
                absences,
                average,
                recentGrades = grades.OrderByDescending(g => g.Date).Take(3).Select(g => new {
                    subject = g.Subject == null ? "N/A" : g.Subject.Name,
                    score = g.Score
                })
            });
        }

        return Ok(new
        {
            parentName = parent.FullName,
            parentEmail = parent.Email,
            parentPhone = parent.Phone,
            parentAddress = parent.Address,
            totalChildren = parent.Children.Count,
            children = childrenData
        });
    }
}
