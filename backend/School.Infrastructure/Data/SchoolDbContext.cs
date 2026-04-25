using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using School.Domain.Entities;
using School.Infrastructure.Identity;

namespace School.Infrastructure.Data;

public class SchoolDbContext : IdentityDbContext<ApplicationUser>
{
    public SchoolDbContext(DbContextOptions<SchoolDbContext> options) : base(options)
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        // Suppress the warning that crashes the app during seeding when model changes are pending
        optionsBuilder.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    public DbSet<Student> Students { get; set; }
    public DbSet<Parent> Parents { get; set; }
    public DbSet<Teacher> Teachers { get; set; }
    public DbSet<ClassRoom> ClassRooms { get; set; }
    public DbSet<GradeLevel> GradeLevels { get; set; }
    public DbSet<Subject> Subjects { get; set; }
    public DbSet<Session> Sessions { get; set; }
    public DbSet<Attendance> Attendances { get; set; }
    public DbSet<Exam> Exams { get; set; }
    public DbSet<ExamResult> ExamResults { get; set; }
    public DbSet<GradeRecord> GradeRecords { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Video> Videos { get; set; }
    public DbSet<Assignment> Assignments { get; set; }
    public DbSet<AssignmentSubmission> AssignmentSubmissions { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<QuestionChoice> QuestionChoices { get; set; }
    public DbSet<Announcement> Announcements { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Configure Student -> Parent relationship
        builder.Entity<Student>()
            .HasOne(s => s.Parent)
            .WithMany(p => p.Children)
            .HasForeignKey(s => s.ParentId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure ClassRoom relationships
        builder.Entity<ClassRoom>()
            .HasOne(c => c.Teacher)
            .WithMany(t => t.ClassRooms)
            .HasForeignKey(c => c.TeacherId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Student>()
            .HasOne(s => s.ClassRoom)
            .WithMany(c => c.Students)
            .HasForeignKey(s => s.ClassRoomId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure Teacher relationships
        builder.Entity<Subject>()
            .HasOne(s => s.Teacher)
            .WithMany(t => t.Subjects)
            .HasForeignKey(s => s.TeacherId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Exam>()
            .HasOne(e => e.Teacher)
            .WithMany(t => t.Exams)
            .HasForeignKey(e => e.TeacherId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Session>()
            .HasOne(s => s.Teacher)
            .WithMany(t => t.Sessions)
            .HasForeignKey(s => s.TeacherId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure Subject dependencies (Deleting a subject deletes everything related)
        builder.Entity<Exam>()
            .HasOne(e => e.Subject)
            .WithMany(s => s.Exams)
            .HasForeignKey(e => e.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Assignment>()
            .HasOne(a => a.Subject)
            .WithMany(s => s.Assignments)
            .HasForeignKey(a => a.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<GradeRecord>()
            .HasOne(gr => gr.Subject)
            .WithMany()
            .HasForeignKey(gr => gr.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Session>()
            .HasOne(s => s.Subject)
            .WithMany(sub => sub.Sessions)
            .HasForeignKey(s => s.SubjectId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure ClassRoom dependencies (Deleting a class deletes its sessions/exams/assignments)
        builder.Entity<Exam>()
            .HasOne(e => e.ClassRoom)
            .WithMany()
            .HasForeignKey(e => e.ClassRoomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Assignment>()
            .HasOne(a => a.ClassRoom)
            .WithMany()
            .HasForeignKey(a => a.ClassRoomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Session>()
            .HasOne(s => s.ClassRoom)
            .WithMany(c => c.Sessions)
            .HasForeignKey(s => s.ClassRoomId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure GradeLevel -> ClassRoom
        builder.Entity<ClassRoom>()
            .HasOne(c => c.GradeLevel)
            .WithMany(g => g.ClassRooms)
            .HasForeignKey(c => c.GradeLevelId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure Student dependencies
        builder.Entity<ExamResult>()
            .HasOne(er => er.Student)
            .WithMany(s => s.ExamResults)
            .HasForeignKey(er => er.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<GradeRecord>()
            .HasOne(gr => gr.Student)
            .WithMany(s => s.GradeRecords)
            .HasForeignKey(gr => gr.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Attendance>()
            .HasOne(a => a.Student)
            .WithMany(s => s.Attendances)
            .HasForeignKey(a => a.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Other dependencies
        builder.Entity<Attendance>()
            .HasOne(a => a.Session)
            .WithMany(s => s.Attendances)
            .HasForeignKey(a => a.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ExamResult>()
            .HasOne(er => er.Exam)
            .WithMany(e => e.ExamResults)
            .HasForeignKey(er => er.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<AssignmentSubmission>()
            .HasOne(s => s.Assignment)
            .WithMany(a => a.Submissions)
            .HasForeignKey(s => s.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure Question dependencies
        builder.Entity<Question>()
            .HasOne(q => q.Exam)
            .WithMany(e => e.Questions)
            .HasForeignKey(q => q.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<QuestionChoice>()
            .HasOne(qc => qc.Question)
            .WithMany(q => q.Choices)
            .HasForeignKey(qc => qc.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure Message relationships
        builder.Entity<Message>()
            .HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Message>()
            .HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(m => m.ReceiverId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure Video -> Subject relation
        builder.Entity<Video>()
            .HasOne(v => v.Subject)
            .WithMany()
            .HasForeignKey(v => v.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure Video -> Teacher relation
        builder.Entity<Video>()
            .HasOne(v => v.Teacher)
            .WithMany()
            .HasForeignKey(v => v.TeacherId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
