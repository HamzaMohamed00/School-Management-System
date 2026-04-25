using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;
using System.Globalization;

namespace School.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class ReportsController : ControllerBase
{
    private readonly SchoolDbContext _context;

    public ReportsController(SchoolDbContext context)
    {
        _context = context;
    }

    [HttpGet("admin-stats")]
    public async Task<IActionResult> GetAdminReportsStats(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? gradeName)
    {
        var attendanceQuery = _context.Attendances
            .Include(a => a.Session)
            .ThenInclude(s => s.ClassRoom)
            .ThenInclude(c => c!.GradeLevel)
            .AsQueryable();

        var sessionsQuery = _context.Sessions
            .Include(s => s.ClassRoom)
            .ThenInclude(c => c!.GradeLevel)
            .AsQueryable();

        if (startDate.HasValue)
        {
            attendanceQuery = attendanceQuery.Where(a => a.Session.SessionDate >= startDate.Value);
            sessionsQuery = sessionsQuery.Where(s => s.SessionDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            attendanceQuery = attendanceQuery.Where(a => a.Session.SessionDate <= endDate.Value);
            sessionsQuery = sessionsQuery.Where(s => s.SessionDate <= endDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(gradeName) && gradeName != "الكل")
        {
            attendanceQuery = attendanceQuery.Where(a => a.Session.ClassRoom != null && a.Session.ClassRoom.GradeLevel != null && a.Session.ClassRoom.GradeLevel.Name == gradeName);
            sessionsQuery = sessionsQuery.Where(s => s.ClassRoom != null && s.ClassRoom.GradeLevel != null && s.ClassRoom.GradeLevel.Name == gradeName);
        }

        // 1. Completed Sessions
        var completedSessions = await sessionsQuery.CountAsync();

        // 2. Absence Days (Total Absent Records)
        var absenceDays = await attendanceQuery.CountAsync(a => !a.IsPresent);

        // 3. Average Attendance
        var totalAttendances = await attendanceQuery.CountAsync();
        var presentAttendances = await attendanceQuery.CountAsync(a => a.IsPresent);
        double averageAttendance = totalAttendances > 0
            ? Math.Round((double)presentAttendances / totalAttendances * 100, 1)
            : 0;

        // 4. Absence by Grade Level (for Donut Chart)
        var absenceByGrade = await attendanceQuery
            .Where(a => !a.IsPresent && a.Session.ClassRoom != null && a.Session.ClassRoom.GradeLevel != null)
            .GroupBy(a => a.Session.ClassRoom.GradeLevel.Name)
            .Select(g => new
            {
                GradeName = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        // 5. Weekly Attendance (for Bar Chart)
        var sevenDaysAgo = DateTime.Today.AddDays(-6);
        var weeklyDataRaw = await _context.Attendances
            .Include(a => a.Session)
            .Where(a => a.Session.SessionDate >= sevenDaysAgo)
            .GroupBy(a => a.Session.SessionDate)
            .Select(g => new
            {
                Date = g.Key,
                Present = g.Count(x => x.IsPresent),
                Absent = g.Count(x => !x.IsPresent)
            })
            .ToListAsync();

        var arabicCulture = new CultureInfo("ar-EG");
        var weeklyAttendance = Enumerable.Range(0, 7)
            .Select(i => sevenDaysAgo.AddDays(i))
            .Select(date =>
            {
                var match = weeklyDataRaw.FirstOrDefault(d => d.Date.Date == date.Date);
                return new
                {
                    Day = date.ToString("dddd", arabicCulture),
                    Present = match?.Present ?? 0,
                    Absent = match?.Absent ?? 0,
                    Date = date
                };
            })
            .OrderBy(x => x.Date)
            .ToList();

        return Ok(new
        {
            completedSessions,
            absenceDays,
            averageAttendance,
            absenceByGrade,
            weeklyAttendance
        });
    }
}
