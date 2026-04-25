using School.Application.Interfaces;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace School.Infrastructure.Services;

public class FaceRecognitionService : IFaceRecognitionService
{
    private readonly HttpClient _httpClient;

    public FaceRecognitionService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        // In a real app, inject IConfiguration and get this from appsettings.json
        _httpClient.BaseAddress = new Uri("http://localhost:8080"); 
    }

    public async Task<bool> TrainFaceAsync(int studentId, byte[] imageBytes, string fileName)
    {
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent(studentId.ToString()), "student_id");
        
        var imageContent = new ByteArrayContent(imageBytes);
        imageContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
        content.Add(imageContent, "file", fileName);

        try 
        {
            var response = await _httpClient.PostAsync("/train", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Face Recognition Service Connection Failed: {ex.Message}");
            return false;
        }
    }

    public async Task<FaceRecognitionResult> RecognizeFaceAsync(byte[] imageBytes, string fileName)
    {
        using var content = new MultipartFormDataContent();
        
        var imageContent = new ByteArrayContent(imageBytes);
        imageContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
        content.Add(imageContent, "file", fileName);

        var response = await _httpClient.PostAsync("/recognize", content);
        if (!response.IsSuccessStatusCode)
        {
            return new FaceRecognitionResult { Success = false };
        }

        var result = await response.Content.ReadFromJsonAsync<FaceRecognitionResponse>();
        if (result != null && result.Recognized.Any())
        {
            var bestMatch = result.Recognized.OrderByDescending(r => r.Confidence).First();
            return new FaceRecognitionResult
            {
                Success = true,
                StudentId = bestMatch.StudentId,
                Confidence = bestMatch.Confidence
            };
        }

        return new FaceRecognitionResult { Success = false };
    }
}

public class FaceRecognitionResponse
{
    public string Message { get; set; }
    public List<RecognizedFace> Recognized { get; set; } = new();
}

public class RecognizedFace
{
    [JsonPropertyName("student_id")]
    public int StudentId { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }
}
