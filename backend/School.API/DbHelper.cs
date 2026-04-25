
using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;
using School.Domain.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;

// This is a scratch script to list students
public class DbHelper
{
    public static async Task ListStudents(SchoolDbContext context)
    {
        var students = await context.Students.Include(s => s.ClassRoom).ToListAsync();
        Console.WriteLine("\n--- Student List ---");
        foreach (var s in students)
        {
            Console.WriteLine($"ID: {s.Id}, Name: {s.FullName}, Email: {s.Email}, Class: {s.ClassRoom?.Name ?? "N/A"}");
        }
        Console.WriteLine("--------------------\n");
    }
}
