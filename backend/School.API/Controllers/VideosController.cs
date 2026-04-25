using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace School.API.Controllers;

[Authorize]
public class VideosController : BaseApiController
{
    private readonly School.Infrastructure.Data.SchoolDbContext _context;

    public VideosController(School.Infrastructure.Data.SchoolDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetVideos([FromQuery] int? subjectId)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userEmail = User.FindFirstValue(ClaimTypes.Email);

        var query = _context.Videos
            .Include(v => v.Subject)
            .AsQueryable();

        // If user is a Teacher, only show videos for subjects they are assigned to
        if (role == "Teacher")
        {
            var teacher = await _context.Teachers
                .Include(t => t.Subjects)
                .FirstOrDefaultAsync(t => t.Email == userEmail);

            if (teacher != null)
            {
                var teacherSubjectIds = teacher.Subjects.Select(s => s.Id).ToList();
                query = query.Where(v => teacherSubjectIds.Contains(v.SubjectId));
            }
        }

        if (subjectId.HasValue)
        {
            query = query.Where(v => v.SubjectId == subjectId.Value);
        }

        var videos = await query
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new
            {
                id = v.Id,
                thumbnail = v.ThumbnailUrl,
                duration = v.Duration,
                subject = v.Subject != null ? v.Subject.Name : "عام",
                views = v.Views,
                title = v.Title,
                description = v.Description,
                url = v.Url
            })
            .ToListAsync();

        return Ok(videos);
    }

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> AddVideo([FromBody] School.Domain.Entities.Video video)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.Email == userEmail);

        video.Id = 0; // Ensure we are creating a new record
        video.CreatedAt = DateTime.UtcNow;
        if (teacher != null)
        {
            video.TeacherId = teacher.Id;
        }

        // Wipe navigation properties to prevent EF from trying to 'track' them during create
        video.Subject = null;
        video.Teacher = null;

        _context.Videos.Add(video);
        await _context.SaveChangesAsync();
        return Ok(video);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> UpdateVideo(int id, [FromBody] School.Domain.Entities.Video video)
    {
        if (id != video.Id) return BadRequest();
        _context.Entry(video).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.Videos.Any(e => e.Id == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> DeleteVideo(int id)
    {
        var video = await _context.Videos.FindAsync(id);
        if (video == null) return NotFound();

        _context.Videos.Remove(video);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
