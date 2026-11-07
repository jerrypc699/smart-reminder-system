using System;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;

public class LogCheck {
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern void CredFree(IntPtr buffer);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
    }

    public static string ReadCred(string target) {
        IntPtr p;
        if (CredRead(target, 1, 0, out p)) {
            CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
            byte[] b = new byte[c.CredentialBlobSize];
            Marshal.Copy(c.CredentialBlob, b, 0, c.CredentialBlobSize);
            CredFree(p);
            return Encoding.UTF8.GetString(b).Trim();
        }
        return null;
    }

    public static void Main() {
        string token = ReadCred("LegacyGeneric:target=GitHub - https://api.github.com/jerrypc699");
        HttpWebRequest req = (HttpWebRequest)WebRequest.Create("https://api.github.com/repos/jerrypc699/smart-reminder-system/actions/jobs/128353392696/logs");
        req.Headers.Add("Authorization", "token " + token);
        req.UserAgent = "DrAbdelazizApp";

        try {
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            using (StreamReader reader = new StreamReader(resp.GetResponseStream())) {
                string line;
                bool printNext = false;
                int count = 0;
                while ((line = reader.ReadLine()) != null) {
                    if (line.Contains("What went wrong:")) {
                        printNext = true;
                    }
                    if (printNext && count++ < 30) {
                        Console.WriteLine(line);
                    }
                }
            }
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
        }
    }
}

