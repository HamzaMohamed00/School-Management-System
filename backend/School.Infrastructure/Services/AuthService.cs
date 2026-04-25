using Microsoft.AspNetCore.Identity;
using School.Application.Interfaces;
using School.Infrastructure.Identity;
using School.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace School.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITokenService _tokenService;
    private readonly SchoolDbContext _context;

    public AuthService(UserManager<ApplicationUser> userManager, 
                       SignInManager<ApplicationUser> signInManager, 
                       ITokenService tokenService,
                       SchoolDbContext context)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
        _context = context;
    }

    public async Task<string> LoginAsync(string email, string password)
    {
        Console.WriteLine($"[DEBUG] Login attempt for: {email}");
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null) 
        {
            Console.WriteLine($"[DEBUG] User not found: {email}");
            return string.Empty;
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, password, false);
        if (!result.Succeeded) 
        {
            Console.WriteLine($"[DEBUG] Password check failed for: {email}");
            return string.Empty;
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "User";
        Console.WriteLine($"[DEBUG] Login successful for: {email}. Role: {role}");

        int? entityId = role switch
        {
            "Student" => user.StudentId,
            "Teacher" => user.TeacherId,
            "Parent" => user.ParentId,
            _ => null
        };

        // Auto-repair missing links for existing users
        if (entityId == null)
        {
            if (role == "Student")
            {
                var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id || s.Email == user.Email);
                if (student != null)
                {
                    entityId = student.Id;
                    user.StudentId = student.Id;
                    await _userManager.UpdateAsync(user);
                    Console.WriteLine($"[DEBUG] Auto-repaired StudentId for: {email}");
                }
            }
            else if (role == "Teacher")
            {
                var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id || t.Email == user.Email);
                if (teacher != null)
                {
                    entityId = teacher.Id;
                    user.TeacherId = teacher.Id;
                    await _userManager.UpdateAsync(user);
                    Console.WriteLine($"[DEBUG] Auto-repaired TeacherId for: {email}");
                }
            }
            else if (role == "Parent")
            {
                var parent = await _context.Parents.FirstOrDefaultAsync(p => p.UserId == user.Id || p.Email == user.Email);
                if (parent != null)
                {
                    entityId = parent.Id;
                    user.ParentId = parent.Id;
                    await _userManager.UpdateAsync(user);
                    Console.WriteLine($"[DEBUG] Auto-repaired ParentId for: {email}");
                }
            }
        }

        var token = _tokenService.CreateToken(user.Id, user.Email ?? string.Empty, role, user.FullName ?? string.Empty, user.AvatarUrl ?? string.Empty, entityId);
        Console.WriteLine($"[DEBUG] Token generated successfully for: {email}, EntityId: {entityId}");
        return token;
    }

    public async Task<bool> RegisterAdminAsync(string userName, string email, string password)
    {
        var user = new ApplicationUser { UserName = userName, Email = email, FullName = userName, DeviceId = null };
        var result = await _userManager.CreateAsync(user, password);
        
        if (result.Succeeded)
        {
            await _userManager.AddToRoleAsync(user, "Admin");
            return true;
        }

        return false;
    }

    public async Task<(bool Succeeded, string? UserId, string[] Errors)> RegisterUserAsync(string fullName, string email, string password, string role, string? phone = null)
    {
        var user = new ApplicationUser 
        { 
            UserName = email, 
            Email = email, 
            FullName = fullName,
            PhoneNumber = phone
        };

        var result = await _userManager.CreateAsync(user, password);
        if (result.Succeeded)
        {
            await _userManager.AddToRoleAsync(user, role);
            return (true, user.Id, Array.Empty<string>());
        }

        return (false, null, result.Errors.Select(e => e.Description).ToArray());
    }

    public async Task<bool> UpdateUserAsync(string userId, string fullName, string email, string? phone)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return false;

        user.FullName = fullName;
        user.Email = email;
        user.UserName = email;
        user.PhoneNumber = phone;

        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<bool> DeleteUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return false;

        var result = await _userManager.DeleteAsync(user);
        return result.Succeeded;
    }

    public async Task<string?> UpdateAvatarAsync(string userId, string avatarBase64)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return null;

        user.AvatarUrl = avatarBase64;
        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded ? user.AvatarUrl : string.Empty;
    }

    public async Task<bool> SetUserEntityLinkAsync(string userId, string entityType, int entityId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return false;

        switch (entityType.ToLower())
        {
            case "student":
                user.StudentId = entityId;
                break;
            case "teacher":
                user.TeacherId = entityId;
                break;
            case "parent":
                user.ParentId = entityId;
                break;
            default:
                return false;
        }

        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<string?> GetUserIdByEmailAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        return user?.Id;
    }
}
