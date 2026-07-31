using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

internal static class ExOneLegacyLauncher
{
    private const uint MbIconError = 0x00000010;

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr window, string text, string caption, uint type);

    private static string QuoteArgument(string value)
    {
        if (value.Length > 0 && value.IndexOfAny(new[] { ' ', '\t', '\n', '\v', '"' }) < 0)
        {
            return value;
        }

        var result = new StringBuilder(value.Length + 2);
        result.Append('"');
        var backslashes = 0;
        foreach (var character in value)
        {
            if (character == '\\')
            {
                backslashes++;
                continue;
            }

            if (character == '"')
            {
                result.Append('\\', backslashes * 2 + 1);
                result.Append('"');
                backslashes = 0;
                continue;
            }

            result.Append('\\', backslashes);
            backslashes = 0;
            result.Append(character);
        }

        result.Append('\\', backslashes * 2);
        result.Append('"');
        return result.ToString();
    }

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            var applicationRoot = AppDomain.CurrentDomain.BaseDirectory;
            var exOnePath = Path.Combine(applicationRoot, "ExOneModLauncher.exe");
            if (!File.Exists(exOnePath))
            {
                throw new FileNotFoundException("ExOneModLauncher.exe was not found beside the compatibility launcher.", exOnePath);
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = exOnePath,
                WorkingDirectory = applicationRoot,
                UseShellExecute = false,
                Arguments = string.Join(" ", Array.ConvertAll(args, QuoteArgument))
            };

            using (var process = Process.Start(startInfo))
            {
                if (process == null)
                {
                    throw new InvalidOperationException("Windows did not start ExOne Mod Launcher.");
                }
                process.WaitForExit();
                return process.ExitCode;
            }
        }
        catch (Exception error)
        {
            MessageBoxW(
                IntPtr.Zero,
                error.Message,
                "ExOne Mod Launcher could not start",
                MbIconError);
            return 1;
        }
    }
}
