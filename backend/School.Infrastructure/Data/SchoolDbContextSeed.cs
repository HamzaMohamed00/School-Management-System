using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using School.Domain.Entities;
using School.Infrastructure.Identity;

namespace School.Infrastructure.Data;

public class SchoolDbContextSeed
{
    public static async Task SeedAsync(SchoolDbContext context, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
    {
        // 1. Seed Roles
        var roles = new List<string> { "Admin", "Teacher", "Student", "Parent" };
        foreach (var roleName in roles)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        // 2. Seed Admin User
        var adminEmail = "admin@school.com";
        if (await userManager.FindByEmailAsync(adminEmail) == null)
        {
            var adminUser = new ApplicationUser
            {
                UserName = "admin",
                Email = adminEmail,
                FullName = "مدير النظام",
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(adminUser, "Admin@123");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }

        // 3. Seed Grade Levels
        if (!context.GradeLevels.Any())
        {
            var levels = new List<GradeLevel>
            {
                new GradeLevel { Name = "الصف الأول" },
                new GradeLevel { Name = "الصف الثاني" },
                new GradeLevel { Name = "الصف الثالث" }
            };
            context.GradeLevels.AddRange(levels);
            await context.SaveChangesAsync();
        }

        // 4. Seed Teachers
        if (!context.Teachers.Any())
        {
            var teacherData = new List<(string Name, string Email, string Phone)>
            {
                ("أحمد محمد", "ahmed@school.com", "0123456789"),
                ("سارة علي", "sara@school.com", "0987654321"),
                ("محمود جاد", "mahmoud@school.com", "0555555555")
            };

            foreach (var t in teacherData)
            {
                var user = await userManager.FindByEmailAsync(t.Email);
                if (user == null)
                {
                    user = new ApplicationUser
                    {
                        UserName = t.Email,
                        Email = t.Email,
                        FullName = t.Name,
                        EmailConfirmed = true
                    };
                    var result = await userManager.CreateAsync(user, "Teacher@123");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(user, "Teacher");
                    }
                }

                if (user != null && !context.Teachers.Any(teacher => teacher.UserId == user.Id))
                {
                    var teacher = new Teacher
                    {
                        UserId = user.Id,
                        FullName = t.Name,
                        Email = t.Email,
                        Phone = t.Phone
                    };
                    context.Teachers.Add(teacher);
                    await context.SaveChangesAsync();
                    user.TeacherId = teacher.Id;
                    await userManager.UpdateAsync(user);
                }
            }
        }

        // 5. Seed ClassRooms
        var existingClassRooms = await context.ClassRooms.ToListAsync();
        var allLevels = await context.GradeLevels.ToListAsync();
        var teachersList = await context.Teachers.ToListAsync();
        
        if (teachersList.Any() && allLevels.Any())
        {
            var teacher1 = teachersList.First();
            var teacher2 = teachersList.Skip(1).FirstOrDefault() ?? teacher1;
            
            foreach (var level in allLevels)
            {
                // If this level has no classrooms, add default ones
                if (!existingClassRooms.Any(c => c.GradeLevelId == level.Id))
                {
                    var newClasses = new List<ClassRoom>
                    {
                        new ClassRoom
                        {
                            Name = $"فصل {level.Name.Replace("الصف ", "")}/أ",
                            Capacity = 30,
                            Location = "مبنى المدرسة",
                            AcademicYear = "2025/2026",
                            GradeLevelId = level.Id,
                            TeacherId = teacher1.Id
                        },
                        new ClassRoom
                        {
                            Name = $"فصل {level.Name.Replace("الصف ", "")}/ب",
                            Capacity = 30,
                            Location = "مبنى المدرسة",
                            AcademicYear = "2025/2026",
                            GradeLevelId = level.Id,
                            TeacherId = teacher2.Id
                        }
                    };
                    context.ClassRooms.AddRange(newClasses);
                }
            }
            await context.SaveChangesAsync();
        }

        // 6. Seed Subjects
        if (!context.Subjects.Any())
        {
            var teachers = await context.Teachers.ToListAsync();
            if (!teachers.Any()) return; // Avoid crash if teachers list is empty

            var teacher1 = teachers.First();
            var teacher2 = teachers.Skip(1).FirstOrDefault() ?? teacher1;
            var class1 = await context.ClassRooms.FirstOrDefaultAsync();
            if (class1 == null) return;

            var subjects = new List<Subject>
            {
                new Subject { Name = "الرياضيات", Code = "MATH", Description = "مادة الرياضيات", TeacherId = teacher1.Id, ClassRoomId = class1.Id },
                new Subject { Name = "العلوم", Code = "SCI", Description = "مادة العلوم", TeacherId = teacher1.Id, ClassRoomId = class1.Id },
                new Subject { Name = "اللغة العربية", Code = "ARB", Description = "مادة اللغة العربية", TeacherId = teacher2.Id, ClassRoomId = class1.Id },
                new Subject { Name = "اللغة الإنجليزية", Code = "ENG", Description = "مادة اللغة الإنجليزية", TeacherId = teacher2.Id, ClassRoomId = class1.Id },
                new Subject { Name = "التربية الإسلامية", Code = "ISL", Description = "مادة التربية الإسلامية", TeacherId = teacher1.Id, ClassRoomId = class1.Id }
            };
            context.Subjects.AddRange(subjects);
            await context.SaveChangesAsync();
        }

        // 7. Seed Parent + link
        if (!context.Parents.Any())
        {
            var parentEmail = "parent@school.com";
            var parentUser = await userManager.FindByEmailAsync(parentEmail);
            if (parentUser == null)
            {
                parentUser = new ApplicationUser
                {
                    UserName = parentEmail,
                    Email = parentEmail,
                    FullName = "خالد أحمد",
                    EmailConfirmed = true
                };
                var result = await userManager.CreateAsync(parentUser, "Parent@123");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(parentUser, "Parent");
                }
            }

            if (parentUser != null)
            {
                var parent = new Parent
                {
                    UserId = parentUser.Id,
                    FullName = "خالد أحمد",
                    Email = parentEmail,
                    Phone = "0112233445",
                    Address = "شارع التحرير، المعادي، القاهرة"
                };
                context.Parents.Add(parent);
                await context.SaveChangesAsync();

                parentUser.ParentId = parent.Id;
                await userManager.UpdateAsync(parentUser);
            }
        }

        // 8. Seed Students
        if (!context.Students.Any())
        {
            var class1 = context.ClassRooms.First();
            var class2 = context.ClassRooms.Skip(1).FirstOrDefault() ?? class1;
            var parent = context.Parents.FirstOrDefault();

            var studentData = new List<(string Name, string Email, int? ClassId, int? ParentId)>
            {
                ("حمزه محمد", "hamza@school.com", class1.Id, parent?.Id),
                ("محمد علي", "mohamed@school.com", class1.Id, parent?.Id),
                ("فاطمة حسن", "fatma@school.com", class1.Id, parent?.Id),
                ("عمر خالد", "omar@school.com", class1.Id, null),
                ("نورا سعيد", "noura@school.com", class2.Id, null)
            };

            foreach (var s in studentData)
            {
                var user = await userManager.FindByEmailAsync(s.Email);
                if (user == null)
                {
                    user = new ApplicationUser
                    {
                        UserName = s.Email,
                        Email = s.Email,
                        FullName = s.Name,
                        EmailConfirmed = true,
                        DeviceId = Guid.NewGuid().ToString()
                    };
                    var result = await userManager.CreateAsync(user, "Student@123");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(user, "Student");
                    }
                }

                if (user != null && !context.Students.Any(student => student.UserId == user.Id))
                {
                    var student = new Student
                    {
                        UserId = user.Id,
                        FullName = s.Name,
                        Email = s.Email,
                        Phone = "0100000000",
                        ClassRoomId = s.ClassId,
                        ParentId = s.ParentId,
                        QrCodeValue = Guid.NewGuid().ToString()
                    };
                    context.Students.Add(student);
                    await context.SaveChangesAsync();
                    user.StudentId = student.Id;
                    await userManager.UpdateAsync(user);
                }
            }
        }

        // 8b. Extra check: Ensure "Hamza Muhammad" specifically exists for testing
        var hamzaEmail = "hamza@school.com";
        var hamzaUser = await userManager.FindByEmailAsync(hamzaEmail);
        if (hamzaUser == null)
        {
            hamzaUser = new ApplicationUser
            {
                UserName = hamzaEmail,
                Email = hamzaEmail,
                FullName = "حمزه محمد",
                EmailConfirmed = true,
                DeviceId = Guid.NewGuid().ToString()
            };
            var result = await userManager.CreateAsync(hamzaUser, "Hamza@123");
            if (result.Succeeded) await userManager.AddToRoleAsync(hamzaUser, "Student");
        }

        if (hamzaUser != null && !context.Students.Any(s => s.UserId == hamzaUser.Id))
        {
            var targetClass = await context.ClassRooms.FirstOrDefaultAsync();
            var targetParent = await context.Parents.FirstOrDefaultAsync();
            var hamzaStudent = new Student
            {
                UserId = hamzaUser.Id,
                FullName = "حمزه محمد",
                Email = hamzaEmail,
                Phone = "0100000000",
                ClassRoomId = targetClass?.Id,
                ParentId = targetParent?.Id,
                QrCodeValue = Guid.NewGuid().ToString()
            };
            context.Students.Add(hamzaStudent);
            await context.SaveChangesAsync();
            hamzaUser.StudentId = hamzaStudent.Id;
            await userManager.UpdateAsync(hamzaUser);
        }


        // 9. Seed Sessions (today and upcoming)
        if (!context.Sessions.Any())
        {
            var teacher1 = context.Teachers.First();
            var class1 = context.ClassRooms.First();
            var subjects = await context.Subjects.ToListAsync();
            var today = DateTime.Today;

            var sessions = new List<Session>
            {
                new Session
                {
                    Title = "حصة الرياضيات - الجبر",
                    SessionDate = today,
                    StartTime = new TimeSpan(8, 0, 0),
                    EndTime = new TimeSpan(8, 45, 0),
                    AttendanceType = "QR",
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[0].Id
                },
                new Session
                {
                    Title = "حصة العلوم - الفيزياء",
                    SessionDate = today,
                    StartTime = new TimeSpan(9, 0, 0),
                    EndTime = new TimeSpan(9, 45, 0),
                    AttendanceType = "QR",
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[1].Id
                },
                new Session
                {
                    Title = "حصة اللغة العربية - النحو",
                    SessionDate = today,
                    StartTime = new TimeSpan(10, 0, 0),
                    EndTime = new TimeSpan(10, 45, 0),
                    AttendanceType = "Manual",
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[2].Id
                },
                new Session
                {
                    Title = "حصة الرياضيات - الهندسة",
                    SessionDate = today.AddDays(1),
                    StartTime = new TimeSpan(8, 0, 0),
                    EndTime = new TimeSpan(8, 45, 0),
                    AttendanceType = "QR",
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[0].Id
                },
                new Session
                {
                    Title = "حصة الإنجليزي - Grammar",
                    SessionDate = today.AddDays(1),
                    StartTime = new TimeSpan(9, 0, 0),
                    EndTime = new TimeSpan(9, 45, 0),
                    AttendanceType = "QR",
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[3].Id
                }
            };
            context.Sessions.AddRange(sessions);
            await context.SaveChangesAsync();
        }

        // 10. Seed Attendance Records
        if (!context.Attendances.Any())
        {
            var students = await context.Students.ToListAsync();
            var sessions = await context.Sessions.ToListAsync();

            foreach (var session in sessions.Where(s => s.SessionDate <= DateTime.Today))
            {
                var classStudents = students.Where(s => s.ClassRoomId == session.ClassRoomId).ToList();
                foreach (var student in classStudents)
                {
                    var isPresent = new Random(student.Id + session.Id).Next(100) > 15; // ~85% attendance
                    context.Attendances.Add(new Attendance
                    {
                        StudentId = student.Id,
                        SessionId = session.Id,
                        IsPresent = isPresent,
                        Status = isPresent ? "Present" : "Absent",
                        Notes = "",
                        Time = session.SessionDate.Add(session.StartTime).AddMinutes(isPresent ? 2 : 0),
                        RecordedAt = session.SessionDate.Add(session.StartTime),
                        Method = session.AttendanceType
                    });
                }
            }
            await context.SaveChangesAsync();
        }

        // 11. Seed Assignments
        if (!context.Assignments.Any())
        {
            var teacher1 = context.Teachers.First();
            var class1 = context.ClassRooms.First();
            var subjects = await context.Subjects.ToListAsync();

            var assignments = new List<Assignment>
            {
                new Assignment
                {
                    Title = "حل تمارين الجبر - الفصل الثالث",
                    Description = "حل جميع تمارين الصفحات 45-50 من كتاب الرياضيات",
                    DueDate = DateTime.Today.AddDays(3),
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[0].Id
                },
                new Assignment
                {
                    Title = "تقرير عن التفاعلات الكيميائية",
                    Description = "كتابة تقرير من صفحتين عن أنواع التفاعلات الكيميائية مع أمثلة",
                    DueDate = DateTime.Today.AddDays(5),
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[1].Id
                },
                new Assignment
                {
                    Title = "إعراب الآيات القرآنية",
                    Description = "إعراب الآيات من سورة البقرة (آية 1-5) إعراباً تاماً",
                    DueDate = DateTime.Today.AddDays(2),
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[2].Id
                },
                new Assignment
                {
                    Title = "Write an English Essay",
                    Description = "Write a 200-word essay about your favorite hobby",
                    DueDate = DateTime.Today.AddDays(7),
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[3].Id
                }
            };
            context.Assignments.AddRange(assignments);
            await context.SaveChangesAsync();

            // Seed some submissions
            var assignmentsList = await context.Assignments.ToListAsync();
            var student1 = context.Students.First();
            context.AssignmentSubmissions.Add(new AssignmentSubmission
            {
                AssignmentId = assignmentsList[0].Id,
                StudentId = student1.Id,
                SubmissionDate = DateTime.UtcNow.AddHours(-2),
                FileUrl = "https://example.com/homework1.pdf",
                StudentNotes = "تم حل جميع التمارين",
                Grade = 90,
                TeacherFeedback = "عمل ممتاز!"
            });
            context.AssignmentSubmissions.Add(new AssignmentSubmission
            {
                AssignmentId = assignmentsList[1].Id,
                StudentId = student1.Id,
                SubmissionDate = DateTime.UtcNow.AddHours(-1),
                FileUrl = "https://example.com/report.pdf",
                StudentNotes = "التقرير جاهز"
            });
            await context.SaveChangesAsync();
        }

        // 12. Seed Grade Records
        if (!context.GradeRecords.Any())
        {
            var students = await context.Students.ToListAsync();
            var subjects = await context.Subjects.ToListAsync();
            var rng = new Random(42);

            foreach (var student in students)
            {
                foreach (var subject in subjects.Take(4))
                {
                    context.GradeRecords.Add(new GradeRecord
                    {
                        StudentId = student.Id,
                        SubjectId = subject.Id,
                        Score = rng.Next(60, 100),
                        GradeType = "Midterm",
                        Notes = "اختبار نصف الفصل",
                        Date = DateTime.Today.AddDays(-14)
                    });
                    context.GradeRecords.Add(new GradeRecord
                    {
                        StudentId = student.Id,
                        SubjectId = subject.Id,
                        Score = rng.Next(65, 100),
                        GradeType = "Homework",
                        Notes = "واجب منزلي",
                        Date = DateTime.Today.AddDays(-7)
                    });
                }
            }
            await context.SaveChangesAsync();
        }

        // 13. Seed Videos
        if (!context.Videos.Any())
        {
            var subjects = await context.Subjects.ToListAsync();
            var teacher1 = context.Teachers.First();

            var videos = new List<Video>
            {
                new Video
                {
                    Title = "شرح المعادلات من الدرجة الأولى",
                    Description = "شرح تفصيلي لحل المعادلات الخطية مع أمثلة",
                    Url = "https://www.youtube.com/watch?v=example1",
                    ThumbnailUrl = "https://img.youtube.com/vi/example1/hqdefault.jpg",
                    Duration = "15:30",
                    Views = 120,
                    SubjectId = subjects[0].Id,
                    TeacherId = teacher1.Id
                },
                new Video
                {
                    Title = "تجربة التفاعل الكيميائي",
                    Description = "فيديو عملي لتجربة التفاعلات الكيميائية في المختبر",
                    Url = "https://www.youtube.com/watch?v=example2",
                    ThumbnailUrl = "https://img.youtube.com/vi/example2/hqdefault.jpg",
                    Duration = "22:45",
                    Views = 85,
                    SubjectId = subjects[1].Id,
                    TeacherId = teacher1.Id
                },
                new Video
                {
                    Title = "قواعد النحو - المبتدأ والخبر",
                    Description = "شرح مبسط لقاعدة المبتدأ والخبر مع تمارين",
                    Url = "https://www.youtube.com/watch?v=example3",
                    ThumbnailUrl = "https://img.youtube.com/vi/example3/hqdefault.jpg",
                    Duration = "18:20",
                    Views = 200,
                    SubjectId = subjects[2].Id,
                    TeacherId = teacher1.Id
                },
                new Video
                {
                    Title = "English Grammar - Tenses",
                    Description = "Understanding present, past, and future tenses in English",
                    Url = "https://www.youtube.com/watch?v=example4",
                    ThumbnailUrl = "https://img.youtube.com/vi/example4/hqdefault.jpg",
                    Duration = "25:10",
                    Views = 150,
                    SubjectId = subjects[3].Id,
                    TeacherId = teacher1.Id
                }
            };
            context.Videos.AddRange(videos);
            await context.SaveChangesAsync();
        }

        // 14. Seed Exams
        if (!context.Exams.Any())
        {
            var teacher1 = context.Teachers.First();
            var class1 = context.ClassRooms.First();
            var subjects = await context.Subjects.ToListAsync();

            var exams = new List<Exam>
            {
                new Exam
                {
                    Title = "اختبار الرياضيات - الفصل الأول",
                    Description = "اختبار شامل على الجبر والهندسة",
                    StartTime = DateTime.Today.AddDays(10).AddHours(8),
                    EndTime = DateTime.Today.AddDays(10).AddHours(9).AddMinutes(30),
                    MaxScore = 100,
                    ExamType = "Midterm",
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[0].Id
                },
                new Exam
                {
                    Title = "اختبار قصير - العلوم",
                    Description = "اختبار قصير على الوحدة الثالثة",
                    StartTime = DateTime.Today.AddDays(3).AddHours(10),
                    EndTime = DateTime.Today.AddDays(3).AddHours(10).AddMinutes(30),
                    MaxScore = 20,
                    ExamType = "Quiz",
                    TeacherId = teacher1.Id,
                    ClassRoomId = class1.Id,
                    SubjectId = subjects[1].Id
                }
            };
            context.Exams.AddRange(exams);
            await context.SaveChangesAsync();
        }

        // 15. Seed Announcements
        if (!context.Announcements.Any())
        {
            var adminUser = await userManager.FindByEmailAsync("admin@school.com");
            var announcements = new List<Announcement>
            {
                new Announcement
                {
                    Title = "بداية الفصل الدراسي الثاني",
                    Content = "يسعدنا إعلامكم ببدء الفصل الدراسي الثاني يوم الأحد القادم. نتمنى للجميع فصلاً دراسياً موفقاً.",
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    Audience = "All",
                    CreatedBy = adminUser?.Id ?? ""
                },
                new Announcement
                {
                    Title = "اجتماع أولياء الأمور",
                    Content = "ندعو جميع أولياء الأمور لحضور الاجتماع الدوري يوم الأربعاء القادم الساعة 4 مساءً في قاعة المدرسة.",
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    Audience = "Parents",
                    CreatedBy = adminUser?.Id ?? ""
                },
                new Announcement
                {
                    Title = "تحديث جدول الاختبارات",
                    Content = "تم تحديث جدول الاختبارات النهائية. يرجى مراجعة الجدول الجديد من خلال لوحة التحكم.",
                    CreatedAt = DateTime.UtcNow,
                    Audience = "Students",
                    CreatedBy = adminUser?.Id ?? ""
                }
            };
            context.Announcements.AddRange(announcements);
            await context.SaveChangesAsync();
            // 17. Seed a few chat messages for Demo
            if (!context.Messages.Any())
            {
                var teacher = await context.Teachers.FirstOrDefaultAsync();
                var parent = await context.Parents.FirstOrDefaultAsync();
                if (teacher != null && parent != null)
                {
                    var messages = new List<Message>
                    {
                        new Message { SenderId = teacher.UserId, ReceiverId = parent.UserId, Content = "مرحباً أستاذ خالد، أردت فقط إبلاغك بأن أحمد أدى بشكل رائع في اختبار الرياضيات اليوم.", SentAt = DateTime.Now.AddDays(-1) },
                        new Message { SenderId = parent.UserId, ReceiverId = teacher.UserId, Content = "شكراً جزيلاً أستاذ أحمد، يسعدني سماع ذلك. هل هناك أي نقاط يحتاج للتركيز عليها؟", SentAt = DateTime.Now.AddHours(-5) },
                        new Message { SenderId = teacher.UserId, ReceiverId = parent.UserId, Content = "فقط مراجعة جدول الضرب بشكل دوري، وسيكون ممتازاً.", SentAt = DateTime.Now.AddHours(-1) }
                    };
                    context.Messages.AddRange(messages);
                    await context.SaveChangesAsync();
                }
            }
        }
    }
}
    
