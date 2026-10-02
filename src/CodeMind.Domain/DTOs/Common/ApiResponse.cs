using System.Collections.Generic;

namespace CodeMind.Domain.DTOs.Common;

public class ApiResponse<T>
{
    public T? Data { get; set; }
    public bool IsSuccess { get; set; }
    public string? Message { get; set; }
    public List<string>? Errors { get; set; }

    public static ApiResponse<T> Success(T data, string message = "İşlem başarılı.")
    {
        return new ApiResponse<T> 
        { 
            Data = data, 
            IsSuccess = true, 
            Message = message 
        };
    }

    public static ApiResponse<T> Fail(string error, string message = "İşlem başarısız.")
    {
        return new ApiResponse<T> 
        { 
            IsSuccess = false, 
            Message = message, 
            Errors = new List<string> { error } 
        };
    }
    
    public static ApiResponse<T> Fail(List<string> errors, string message = "İşlem başarısız.")
    {
        return new ApiResponse<T> 
        { 
            IsSuccess = false, 
            Message = message, 
            Errors = errors 
        };
    }
}
