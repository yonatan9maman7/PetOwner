using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace PetOwner.Api.Services;

public class SmtpEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly IWebHostEnvironment _env;

    public SmtpEmailService(IOptions<EmailSettings> settings, ILogger<SmtpEmailService> logger, IWebHostEnvironment env)
    {
        _settings = settings.Value;
        _logger = logger;
        _env = env;
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        using var client = new SmtpClient(_settings.Host, _settings.Port);
        client.EnableSsl = true;
        client.UseDefaultCredentials = false;
        client.Credentials = new NetworkCredential(_settings.Username, _settings.Password);

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromEmail, _settings.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        message.To.Add(to);

        try
        {
            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {To} with subject '{Subject}'", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            throw;
        }
    }

    public async Task SendWelcomeEmailAsync(string email, string name, string language)
    {
        var (subject, body) = BuildWelcomeEmail(name, language);

        _logger.LogInformation(
            "Welcome email for {Email} (lang={Language}):\nSubject: {Subject}\nBody:\n{Body}",
            email, language, subject, body);

        if (_env.IsDevelopment())
        {
            _logger.LogInformation("Development mode — skipping actual send of welcome email to {Email}", email);
            return;
        }

        await SendEmailAsync(email, subject, body);
    }

    private static (string Subject, string Body) BuildWelcomeEmail(string name, string language)
    {
        if (language == "he")
        {
            const string subject = "ברוכים הבאים למשפחת PetOwner! 🐾";
            var body = $"""
                <div dir="rtl" style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background-color:#f4f1fb;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 30px;text-align:center;">
                        <div style="font-size:48px;margin-bottom:12px;">🐾</div>
                        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">ברוכים הבאים למשפחת PetOwner!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:36px 30px 20px;text-align:right;">
                        <p style="margin:0 0 16px;font-size:18px;color:#1e1b4b;">היי {name}, איזה כיף שהצטרפת אלינו! 🎉</p>
                        <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
                          אנחנו פה כדי לוודא שחיית המחמד שלך מקבלת את הטוב ביותר — החל מדוג-ווקרים, דרך מאלפים ועד ביטוח.
                          הקהילה שלנו רק מחכה להכיר אתכם. יאללה, בואו נתחיל!
                        </p>
                        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                          <tr>
                            <td style="background:#6366f1;border-radius:12px;padding:14px 36px;">
                              <a href="https://petowner.co.il" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">בואו נתחיל &larr;</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 30px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
                        <p style="margin:0;font-size:13px;color:#9ca3af;">© PetOwner — הבית של בעלי חיות המחמד 🐶🐱</p>
                      </td>
                    </tr>
                  </table>
                </div>
                """;
            return (subject, body);
        }
        else
        {
            const string subject = "Welcome to the PetOwner Family! 🐾";
            var body = $"""
                <div style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background-color:#f4f1fb;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 30px;text-align:center;">
                        <div style="font-size:48px;margin-bottom:12px;">🐾</div>
                        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Welcome to the PetOwner Family!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:36px 30px 20px;text-align:left;">
                        <p style="margin:0 0 16px;font-size:18px;color:#1e1b4b;">Hi {name}, we're thrilled to have you on board! 🎉</p>
                        <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
                          We are here to make sure your pet gets the absolute best — from walkers and trainers to insurance.
                          Our community can't wait to meet you. Let's get started!
                        </p>
                        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                          <tr>
                            <td style="background:#6366f1;border-radius:12px;padding:14px 36px;">
                              <a href="https://petowner.co.il" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Let's Get Started &rarr;</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 30px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
                        <p style="margin:0;font-size:13px;color:#9ca3af;">© PetOwner — Home for Pet Owners 🐶🐱</p>
                      </td>
                    </tr>
                  </table>
                </div>
                """;
            return (subject, body);
        }
    }
}
