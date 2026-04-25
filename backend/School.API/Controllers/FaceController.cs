using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Interfaces;

namespace School.API.Controllers;

[Authorize(Roles = "Admin,Teacher")]
public class FaceController : BaseApiController
{
    private readonly IFaceRecognitionService _faceRecognitionService;

    public FaceController(IFaceRecognitionService faceRecognitionService)
    {
        _faceRecognitionService = faceRecognitionService;
    }

    [HttpPost("train/{studentId}")]
    public async Task<ActionResult> TrainFace(int studentId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Image is required");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        
        var result = await _faceRecognitionService.TrainFaceAsync(studentId, ms.ToArray(), file.FileName);
        if (result) return Ok(new { success = true });
        
        return BadRequest(new { message = "فشل التدريب. يرجى التأكد من تشغيل خدمة التعرف على الوجوه (run_face_service.bat)" });
    }
}
