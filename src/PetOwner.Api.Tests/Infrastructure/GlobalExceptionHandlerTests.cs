using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using PetOwner.Api.Infrastructure;
using Xunit;

namespace PetOwner.Api.Tests.Infrastructure;

public class GlobalExceptionHandlerTests
{
    [Fact]
    public async Task TryHandleAsync_WhenExceptionThrown_WritesProblemDetailsWith500()
    {
        // Arrange
        var sut = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/test";
        context.Response.Body = new MemoryStream();
        context.TraceIdentifier = "trace-abc";

        // Act
        var handled = await sut.TryHandleAsync(context, new InvalidOperationException("boom"), CancellationToken.None);

        // Assert
        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        var problem = await JsonSerializer.DeserializeAsync<ProblemDetails>(
            context.Response.Body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(problem);
        Assert.Equal(500, problem.Status);
        Assert.Equal("/api/test", problem.Instance);
        Assert.True(problem.Extensions.ContainsKey("traceId"));
    }
}
