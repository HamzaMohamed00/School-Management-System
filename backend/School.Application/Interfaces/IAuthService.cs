namespace School.Application.Interfaces;

public interface IAuthService
{
    Task<string> LoginAsync(string email, string password);
    Task<bool> RegisterAdminAsync(string userName, string email, string password);
    Task<(bool Succeeded, string? UserId, string[] Errors)> RegisterUserAsync(string fullName, string email, string password, string role, string? phone = null);
    Task<bool> UpdateUserAsync(string userId, string fullName, string email, string? phone);
    Task<bool> DeleteUserAsync(string userId);
    Task<string?> UpdateAvatarAsync(string userId, string avatarBase64);
    Task<bool> SetUserEntityLinkAsync(string userId, string entityType, int entityId);
    Task<string?> GetUserIdByEmailAsync(string email);
}
