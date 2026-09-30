namespace CodeMind.Domain.Constants;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Developer = "Developer";
    public const string Auditor = "Auditor";

    public static readonly string[] All = { Admin, Developer, Auditor };
}
