namespace School.Domain.Entities;

public class GradeLevel : BaseEntity
{
    public string Name { get; set; } // e.g., Grade 1, Grade 2
    public ICollection<ClassRoom> ClassRooms { get; set; } = new List<ClassRoom>();
}
