namespace School.Domain.Entities;

public class Announcement : BaseEntity
{
    public string Title { get; set; }
    public string Content { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Audience { get; set; } // e.g., All, Teachers, Students, Parents
    public string CreatedBy { get; set; } // ApplicationUserId
}
