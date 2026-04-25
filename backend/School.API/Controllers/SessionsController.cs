using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Features.Sessions.Commands;
using System;
using System.Collections.Generic;
using System.Linq;

namespace School.API.Controllers;

[Authorize]
public class SessionsController : BaseApiController
{
    private readonly School.Infrastructure.Data.SchoolDbContext _context;

    public SessionsController(School.Infrastructure.Data.SchoolDbContext context)
    {
        _context = context;
    }
    [HttpPost("start")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<int>> StartSession(StartSessionCommand command)
    {
        var sessionId = await Mediator.Send(command);
        return Ok(sessionId);
    }

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<int>> CreateScheduledSession(CreateScheduledSessionCommand command)
    {
        var sessionId = await Mediator.Send(command);
        return Ok(sessionId);
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveSessions()
    {
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        var sessions = await _context.Sessions
            .Include(s => s.Subject)
            .Include(s => s.ClassRoom)
            .Include(s => s.Teacher)
            .Where(s => s.SessionDate >= today && s.SessionDate < tomorrow)
            .OrderBy(s => s.StartTime)
            .Select(s => new {
                id = s.Id,
                subjectName = s.Subject.Name,
                classRoomName = s.ClassRoom.Name,
                division = s.ClassRoom.Name, // Assuming division is part of name or handled elsewhere
                sectionNo = s.Id,
                studentCount = _context.Students.Count(std => std.ClassRoomId == (s.ClassRoomId ?? 0)),
                teacherName = s.Teacher.FullName,
                startTime = s.SessionDate.Add(s.StartTime),
                endTime = s.SessionDate.Add(s.EndTime),
                dayOfWeek = (int)s.SessionDate.DayOfWeek,
                isActive = s.SessionDate.Add(s.EndTime) > DateTime.Now && s.SessionDate.Add(s.StartTime) < DateTime.Now,
                attendanceAvg = _context.Attendances.Count(a => a.SessionId == s.Id) > 0
                    ? (int)_context.Attendances.Where(a => a.SessionId == s.Id).Average(a => a.IsPresent ? 100 : 0)
                    : 0
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSession(int id)
    {
        var session = await _context.Sessions
            .Include(s => s.Subject)
            .Include(s => s.ClassRoom)
            .Include(s => s.Teacher)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session == null) return NotFound();

        return Ok(new {
            id = session.Id,
            subjectName = session.Subject == null ? "N/A" : session.Subject.Name,
            classRoomName = session.ClassRoom == null ? "N/A" : session.ClassRoom.Name,
            division = session.ClassRoom == null ? "N/A" : session.ClassRoom.Name,
            sectionNo = session.Id,
            studentCount = _context.Students.Count(std => std.ClassRoomId == (session.ClassRoomId ?? 0)),
            teacherName = session.Teacher == null ? "N/A" : session.Teacher.FullName,
            startTime = session.SessionDate.Add(session.StartTime),
            endTime = session.SessionDate.Add(session.EndTime),
            dayOfWeek = (int)session.SessionDate.DayOfWeek,
            isActive = session.SessionDate.Add(session.EndTime) > DateTime.Now && session.SessionDate.Add(session.StartTime) < DateTime.Now
        });
    }

    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetStudentSessions(int studentId)
    {
        var student = await _context.Students.FindAsync(studentId);
        if (student == null) return NotFound();

        var sessions = await _context.Sessions
            .Include(s => s.Subject)
            .Include(s => s.ClassRoom)
            .Where(s => s.ClassRoomId == student.ClassRoomId)
            .OrderBy(s => s.SessionDate)
            .ThenBy(s => s.StartTime)
            .Select(s => new {
                id = s.Id,
                subjectName = s.Subject == null ? "N/A" : s.Subject.Name,
                classRoomName = s.ClassRoom == null ? "N/A" : s.ClassRoom.Name,
                division = s.ClassRoom == null ? "N/A" : s.ClassRoom.Name,
                sectionNo = s.Id,
                studentCount = _context.Students.Count(std => std.ClassRoomId == (s.ClassRoomId ?? 0)),
                teacherName = s.Teacher == null ? "N/A" : s.Teacher.FullName,
                startTime = s.SessionDate.Add(s.StartTime),
                endTime = s.SessionDate.Add(s.EndTime),
                dayOfWeek = (int)s.SessionDate.DayOfWeek,
                isActive = s.SessionDate.Add(s.EndTime) > DateTime.Now && s.SessionDate.Add(s.StartTime) < DateTime.Now,
                attendanceAvg = 0 // Optional for student view
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpGet("teacher/{teacherId}")]
    public async Task<IActionResult> GetTeacherSessions(int teacherId)
    {
        var sessions = await _context.Sessions
            .Include(s => s.Subject)
            .Include(s => s.ClassRoom)
            .Where(s => s.TeacherId == teacherId)
            .OrderBy(s => s.SessionDate)
            .ThenBy(s => s.StartTime)
            .Select(s => new {
                id = s.Id,
                subjectName = s.Subject == null ? "N/A" : s.Subject.Name,
                classRoomName = s.ClassRoom == null ? "N/A" : s.ClassRoom.Name,
                division = s.ClassRoom == null ? "N/A" : s.ClassRoom.Name,
                sectionNo = s.Id,
                studentCount = _context.Students.Count(std => std.ClassRoomId == (s.ClassRoomId ?? 0)),
                teacherName = s.Teacher == null ? "N/A" : s.Teacher.FullName,
                startTime = s.SessionDate.Add(s.StartTime),
                endTime = s.SessionDate.Add(s.EndTime),
                dayOfWeek = (int)s.SessionDate.DayOfWeek,
                isActive = s.SessionDate.Add(s.EndTime) > DateTime.Now && s.SessionDate.Add(s.StartTime) < DateTime.Now,
                attendanceAvg = 0
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpGet("class/{classId}")]
    public async Task<IActionResult> GetClassSessions(int classId)
    {
        var sessions = await _context.Sessions
            .Include(s => s.Subject)
            .Include(s => s.ClassRoom)
            .Include(s => s.Teacher)
            .Where(s => s.ClassRoomId == classId)
            .OrderBy(s => s.SessionDate)
            .ThenBy(s => s.StartTime)
            .Select(s => new {
                id = s.Id,
                subjectId = s.SubjectId,
                subjectName = s.Subject == null ? "N/A" : s.Subject.Name,
                classRoomId = s.ClassRoomId,
                classRoomName = s.ClassRoom == null ? "N/A" : s.ClassRoom.Name,
                teacherId = s.TeacherId,
                teacherName = s.Teacher == null ? "N/A" : s.Teacher.FullName,
                startTime = s.SessionDate.Add(s.StartTime),
                endTime = s.SessionDate.Add(s.EndTime),
                dayOfWeek = (int)s.SessionDate.DayOfWeek,
                isActive = s.SessionDate.Add(s.EndTime) > DateTime.Now && s.SessionDate.Add(s.StartTime) < DateTime.Now
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> UpdateSession(int id, [FromBody] School.Domain.Entities.Session session)
    {
        if (id != session.Id) return BadRequest();
        _context.Entry(session).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.Sessions.Any(e => e.Id == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> DeleteSession(int id)
    {
        try
        {
            var session = await _context.Sessions.FindAsync(id);
            if (session == null) return NotFound(new { message = "الحصة غير موجودة" });

            _context.Sessions.Remove(session);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            // Specifically catching issues like foreign key constraints
            return BadRequest(new { message = "لا يمكن حذف هذه الحصة لوجود بيانات مرتبطة بها (مثل سجلات حضور)", detail = ex.Message });
        }
    }
}
