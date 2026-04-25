namespace School.Domain.Entities;

public class Student : BaseEntity
{
    public string UserId { get; set; } = string.Empty; // Link to AspNetUsers
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime? BirthDate { get; set; }
    public string QrCodeValue { get; set; } = string.Empty;
    
    // Foreign Keys
    public int? ParentId { get; set; }
    public Parent? Parent { get; set; }
    
    public int? ClassRoomId { get; set; }
    public ClassRoom? ClassRoom { get; set; }
    
    // Navigation
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<ExamResult> ExamResults { get; set; } = new List<ExamResult>();
    public ICollection<GradeRecord> GradeRecords { get; set; } = new List<GradeRecord>();
}
