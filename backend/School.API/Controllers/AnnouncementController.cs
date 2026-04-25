using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using School.API.Hubs;
using System.Security.Claims;

namespace School.API.Controllers;

public class CreateAnnouncementDto
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Audience { get; set; } = "All";
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnnouncementController : ControllerBase
{
    private readonly School.Infrastructure.Data.SchoolDbContext _context;
    private readonly IHubContext<ChatHub> _hubContext;

    public AnnouncementController(School.Infrastructure.Data.SchoolDbContext context, IHubContext<ChatHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAnnouncements()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        
        // Admins see everything, others see 'All' or their specific role
        IQueryable<School.Domain.Entities.Announcement> query = _context.Announcements;
        
        if (role != "Admin")
        {
            // Handle pluralization differences (e.g., Parent role seeing Parents audience)
            var rolePlural = role + "s";
            query = query.Where(a => a.Audience == "All" || a.Audience == role || a.Audience == rolePlural);
        }

        var announcements = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(announcements);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest(new { message = "Title and Content are required." });

        var announcement = new School.Domain.Entities.Announcement
        {
            Title = dto.Title,
            Content = dto.Content,
            Audience = string.IsNullOrWhiteSpace(dto.Audience) ? "All" : dto.Audience,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Admin"
        };

        _context.Announcements.Add(announcement);
        await _context.SaveChangesAsync();
        
        await _hubContext.Clients.All.SendAsync("ReceiveNotification", announcement.Title, announcement.Content, announcement.Audience);
        
        return Ok(announcement);
    }
}

