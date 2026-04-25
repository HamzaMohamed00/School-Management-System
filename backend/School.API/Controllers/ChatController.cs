using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Features.Chat.Queries;
using School.Application.Features.Chat.Commands;
using School.Infrastructure.Data;
using School.Infrastructure.Identity;
using School.Domain.Entities;
using System.Security.Claims;

namespace School.API.Controllers;

[Authorize]
public class ChatController : BaseApiController
{
    private readonly SchoolDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public ChatController(SchoolDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("user-info/{userId}")]
    public async Task<ActionResult> GetUserInfo(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound();

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            id = user.Id,
            name = user.FullName ?? user.UserName,
            role = roles.FirstOrDefault() ?? ""
        });
    }

    [HttpGet("history/{otherUserId}")]
    public async Task<ActionResult<List<MessageDto>>> GetChatHistory(string otherUserId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        var query = new GetChatHistoryQuery
        {
            UserId1 = currentUserId ?? "",
            UserId2 = otherUserId
        };

        var messages = await Mediator.Send(query);
        return Ok(messages);
    }

    [HttpPost("send")]
    public async Task<ActionResult> SendMessage([FromBody] SendMessageDto dto)
    {
        var senderId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId)) return Unauthorized();

        var command = new SendMessageCommand
        {
            SenderId = senderId,
            ReceiverId = dto.ReceiverId,
            Content = dto.Content
        };

        var result = await Mediator.Send(command);
        if (result)
            return Ok(new { success = true });
        return BadRequest(new { success = false });
    }

    [HttpGet("contacts")]
    public async Task<ActionResult<IEnumerable<object>>> GetContacts()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "";

        var contactMetadata = new List<ContactMetadataDto>();
        var addedIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // ─── 1. Role-Specific Primary Contacts ───
        if (role == "Student")
        {
            var student = await _context.Students
                .Include(s => s.ClassRoom)
                .FirstOrDefaultAsync(s => s.UserId == userId || s.Email == user.Email);

            // Self-Heal: Link UserId if missing
            if (student != null && string.IsNullOrEmpty(student.UserId)) {
                student.UserId = userId;
                await _context.SaveChangesAsync();
            }

            if (student?.ClassRoomId != null)
            {
                // Helper to resolve UserId
                async Task<string?> ResolveUserIdAsync(Teacher t) {
                    if (!string.IsNullOrEmpty(t.UserId)) return t.UserId;
                    var u = await _userManager.FindByEmailAsync(t.Email);
                    if (u != null) {
                        t.UserId = u.Id;
                        return u.Id;
                    }
                    return null;
                }

                // Homeroom Teacher
                var homeroom = await _context.ClassRooms.Include(c => c.Teacher).FirstOrDefaultAsync(c => c.Id == student.ClassRoomId);
                if (homeroom?.Teacher != null)
                {
                    var tId = await ResolveUserIdAsync(homeroom.Teacher);
                    if (!string.IsNullOrEmpty(tId) && addedIds.Add(tId))
                        contactMetadata.Add(new ContactMetadataDto { Id = tId, Name = homeroom.Teacher.FullName, Role = "Teacher" });
                }

                // Subject Teachers
                var subjectTeachers = await _context.Subjects
                    .Include(s => s.Teacher)
                    .Where(s => s.ClassRoomId == student.ClassRoomId && s.Teacher != null)
                    .Select(s => s.Teacher!)
                    .Distinct()
                    .ToListAsync();

                foreach (var t in subjectTeachers)
                {
                    var tId = await ResolveUserIdAsync(t);
                    if (!string.IsNullOrEmpty(tId) && addedIds.Add(tId))
                        contactMetadata.Add(new ContactMetadataDto { Id = tId, Name = t.FullName, Role = "Teacher" });
                }
                
                await _context.SaveChangesAsync(); // Save any self-healed UserIds
            }

            // Fallback: If no designated teachers were found, show general teachers
            if (contactMetadata.Count == 0)
            {
                var fallbackTeachers = await _context.Teachers.Take(10).ToListAsync();
                foreach (var t in fallbackTeachers)
                {
                    if (string.IsNullOrEmpty(t.UserId)) {
                        var u = await _userManager.FindByEmailAsync(t.Email);
                        if (u != null) { t.UserId = u.Id; }
                    }
                    if (!string.IsNullOrEmpty(t.UserId) && addedIds.Add(t.UserId))
                        contactMetadata.Add(new ContactMetadataDto { Id = t.UserId, Name = t.FullName, Role = "Teacher" });
                }
                await _context.SaveChangesAsync();
            }
        }
        else if (role == "Teacher")
        {
            var teacher = await _context.Teachers
                .FirstOrDefaultAsync(t => t.UserId == userId || t.Email == user.Email);

            // Self-Heal: Link UserId if missing
            if (teacher != null && string.IsNullOrEmpty(teacher.UserId)) {
                teacher.UserId = userId;
                await _context.SaveChangesAsync();
            }

            if (teacher != null)
            {
                // Combine mentored and subject-assigned classrooms
                var classes = await _context.ClassRooms
                    .Include(c => c.Students).ThenInclude(s => s.Parent)
                    .Where(c => c.TeacherId == teacher.Id)
                    .ToListAsync();
                
                var subjClasses = await _context.Subjects
                    .Include(s => s.ClassRoom).ThenInclude(c => (c != null ? c.Students : null))
                        .ThenInclude(s => (s != null ? s.Parent : null))
                    .Where(s => s.TeacherId == teacher.Id && s.ClassRoom != null)
                    .Select(s => s.ClassRoom)
                    .ToListAsync();

                if (subjClasses != null) classes.AddRange(subjClasses!);

                foreach (var cl in classes.Where(c => c != null).DistinctBy(c => c!.Id))
                {
                    foreach (var st in cl!.Students ?? new List<Student>())
                    {
                        if (!string.IsNullOrEmpty(st.UserId) && addedIds.Add(st.UserId))
                            contactMetadata.Add(new ContactMetadataDto { Id = st.UserId, Name = st.FullName, Role = "Student", ClassName = cl.Name });
                        if (st.Parent != null && !string.IsNullOrEmpty(st.Parent.UserId) && addedIds.Add(st.Parent.UserId))
                            contactMetadata.Add(new ContactMetadataDto { Id = st.Parent.UserId, Name = st.Parent.FullName, Role = "Parent", ClassName = cl.Name, StudentName = st.FullName });
                    }
                }
            }
        }
        else if (role == "Parent")
        {
            var parent = await _context.Parents
                .Include(p => p.Children).ThenInclude(s => s.ClassRoom)
                .FirstOrDefaultAsync(p => p.UserId == userId || p.Email == user.Email);

            // Self-Heal: Link UserId if missing
            if (parent != null && string.IsNullOrEmpty(parent.UserId)) {
                parent.UserId = userId;
                await _context.SaveChangesAsync();
            }

            if (parent?.Children != null)
            {
                foreach (var child in parent.Children)
                {
                    if (child.ClassRoomId.HasValue) {
                        var teachers = await _context.Subjects
                            .Include(s => s.Teacher)
                            .Where(s => s.ClassRoomId == child.ClassRoomId && s.Teacher != null && !string.IsNullOrEmpty(s.Teacher.UserId))
                            .Select(s => s.Teacher)
                            .Distinct()
                            .ToListAsync();
                        
                        // Also Add Homeroom
                        var homeroom = await _context.ClassRooms.Include(c => c.Teacher).FirstOrDefaultAsync(c => c.Id == child.ClassRoomId);
                        if (homeroom?.Teacher != null && !string.IsNullOrEmpty(homeroom.Teacher.UserId)) teachers.Add(homeroom.Teacher);

                        foreach (var t in teachers.DistinctBy(x => x!.Id))
                            if (addedIds.Add(t!.UserId))
                                contactMetadata.Add(new ContactMetadataDto { Id = t.UserId, Name = t.FullName, Role = "Teacher", StudentName = child.FullName });
                    }
                }
            }
        }
        else if (role == "Admin")
        {
            var allT = await _context.Teachers.Where(t => !string.IsNullOrEmpty(t.UserId) && t.UserId != userId).Take(50).ToListAsync();
            foreach (var t in allT) if (addedIds.Add(t.UserId)) contactMetadata.Add(new ContactMetadataDto { Id = t.UserId, Name = t.FullName, Role = "Teacher" });
            
            var allS = await _context.Students.Where(s => !string.IsNullOrEmpty(s.UserId) && s.UserId != userId).Take(50).ToListAsync();
            foreach (var s in allS) if (addedIds.Add(s.UserId)) contactMetadata.Add(new ContactMetadataDto { Id = s.UserId, Name = s.FullName, Role = "Student" });
            
            var allP = await _context.Parents.Where(p => !string.IsNullOrEmpty(p.UserId) && p.UserId != userId).Take(50).ToListAsync();
            foreach (var p in allP) if (addedIds.Add(p.UserId)) contactMetadata.Add(new ContactMetadataDto { Id = p.UserId, Name = p.FullName, Role = "Parent" });
        }

        // ─── 2. Global Additions (Admins & History) ───
        if (role != "Admin")
        {
            var admins = await _userManager.GetUsersInRoleAsync("Admin");
            foreach (var a in admins)
                if (a.Id != userId && addedIds.Add(a.Id))
                    contactMetadata.Add(new ContactMetadataDto { Id = a.Id, Name = a.FullName ?? a.UserName ?? "Admin", Role = "Admin" });
        }

        var talkedToIds = await _context.Messages
            .Where(m => m.SenderId == userId || m.ReceiverId == userId)
            .Select(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
            .Where(id => id != userId)
            .Distinct()
            .ToListAsync();

        foreach (var cid in talkedToIds)
        {
            if (addedIds.Add(cid))
            {
                var st = await _context.Students.FirstOrDefaultAsync(x => x.UserId == cid);
                if (st != null) { contactMetadata.Add(new ContactMetadataDto { Id = cid, Name = st.FullName, Role = "Student" }); continue; }
                
                var tc = await _context.Teachers.FirstOrDefaultAsync(x => x.UserId == cid);
                if (tc != null) { contactMetadata.Add(new ContactMetadataDto { Id = cid, Name = tc.FullName, Role = "Teacher" }); continue; }
                
                var pr = await _context.Parents.FirstOrDefaultAsync(x => x.UserId == cid);
                if (pr != null) { contactMetadata.Add(new ContactMetadataDto { Id = cid, Name = pr.FullName, Role = "Parent" }); continue; }

                var u = await _userManager.FindByIdAsync(cid);
                if (u != null) {
                    var r = await _userManager.GetRolesAsync(u);
                    contactMetadata.Add(new ContactMetadataDto { Id = cid, Name = u.FullName ?? u.UserName ?? "User", Role = r.FirstOrDefault() ?? "User" });
                }
            }
        }

        // ─── Batch fetch conversation data ───
        var targetUserIds = contactMetadata.Select(m => m.Id).ToList();
        var conversations = await _context.Messages
            .Where(m => (m.SenderId == userId && targetUserIds.Contains(m.ReceiverId)) ||
                        (m.ReceiverId == userId && targetUserIds.Contains(m.SenderId)))
            .OrderByDescending(m => m.SentAt)
            .ToListAsync();

        var contacts = new List<object>();
        foreach (var meta in contactMetadata)
        {
            string otherId = meta.Id;
            var history = conversations.Where(m => m.SenderId == otherId || m.ReceiverId == otherId).ToList();
            var lastMsg = history.FirstOrDefault();
            var unread = history.Count(m => m.ReceiverId == userId && m.SenderId == otherId && !m.IsRead);

            contacts.Add(new
            {
                id = otherId,
                name = meta.Name,
                role = meta.Role,
                className = meta.ClassName,
                studentName = meta.StudentName,
                lastMessage = lastMsg?.Content ?? "",
                lastMessageTime = lastMsg?.SentAt,
                unreadCount = unread,
                isOnline = false
            });
        }

        return Ok(contacts);
    }

    [HttpPost("mark-read/{messageId}")]
    public async Task<ActionResult> MarkAsRead(int messageId)
    {
        var msg = await _context.Messages.FindAsync(messageId);
        if (msg == null) return NotFound();
        msg.IsRead = true;
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("history/{otherUserId}")]
    public async Task<ActionResult> ClearChatHistory(string otherUserId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var messages = await _context.Messages
            .Where(m => (m.SenderId == currentUserId && m.ReceiverId == otherUserId) ||
                        (m.SenderId == otherUserId && m.ReceiverId == currentUserId))
            .ToListAsync();

        if (messages.Any())
        {
            _context.Messages.RemoveRange(messages);
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true });
    }

    [HttpDelete("contact/{otherUserId}")]
    public async Task<ActionResult> DeleteContact(string otherUserId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var messages = await _context.Messages
            .Where(m => (m.SenderId == currentUserId && m.ReceiverId == otherUserId) ||
                        (m.SenderId == otherUserId && m.ReceiverId == currentUserId))
            .ToListAsync();

        if (messages.Any())
        {
            _context.Messages.RemoveRange(messages);
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true });
    }
}

public class SendMessageDto
{
    public string ReceiverId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

internal class ContactMetadataDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public string? StudentName { get; set; }
}
