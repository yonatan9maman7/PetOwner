using Microsoft.Data.SqlClient;

var connStr = "Data Source=SQL6034.site4now.net;Initial Catalog=db_ac73bd_petownerdb;User Id=db_ac73bd_petownerdb_admin;Password=!QAZ2wsx;Encrypt=True;TrustServerCertificate=True;Command Timeout=30;";
using var conn = new SqlConnection(connStr);
conn.Open();
Console.WriteLine("Connected.");

using var cmd = conn.CreateCommand();
cmd.CommandText = "UPDATE Users SET Role='Admin' WHERE Name='YonatanAdmin'";
var rows = cmd.ExecuteNonQuery();
Console.WriteLine($"Rows updated: {rows}");

cmd.CommandText = "SELECT Id, Name, Role FROM Users WHERE Name='YonatanAdmin'";
using var reader = cmd.ExecuteReader();
while (reader.Read())
    Console.WriteLine($"{reader["Id"]} | {reader["Name"]} | {reader["Role"]}");

Console.WriteLine("Done!");
