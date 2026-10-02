using System;
using System.Collections.Generic;

namespace CodeMind.Domain.DTOs.Document;

public class ZipUploadResponseDto
{
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string BatchId { get; set; } = string.Empty;
    public int TotalExtractedFiles { get; set; }
    public List<string> ExtractedFiles { get; set; } = new();
    public List<Guid> DocumentIds { get; set; } = new();
}
