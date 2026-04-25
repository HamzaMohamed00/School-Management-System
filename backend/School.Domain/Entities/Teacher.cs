using System.Collections.Generic;

namespace School.Domain.Entities;

public class Teacher : BaseEntity
{
    public string UserId { get; set; } = string.Empty; // Link to AspNetUsers
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    
    public ICollection<ClassRoom> ClassRooms { get; set; } = new List<ClassRoom>();
    public ICollection<Subject> Subjects { get; set; } = new List<Subject>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
    public ICollection<Exam> Exams { get; set; } = new List<Exam>();
}
