"use client";

import { FormEvent, useState } from "react";

type ExportStatus = "idle" | "downloading" | "success" | "error";

export default function AdminExportPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [message, setMessage] = useState("");

  const downloadWorkbook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("downloading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/responses.xlsx", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(response.status === 401
          ? "The admin export token is incorrect."
          : "The response workbook could not be generated. Please try again.");
      }

      const workbook = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "questionnaire-responses.xlsx";
      const downloadUrl = URL.createObjectURL(workbook);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setToken("");
      setStatus("success");
      setMessage("The Excel response workbook has been downloaded.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The response workbook could not be downloaded.");
    }
  };

  return <main className="admin-export-shell">
    <section className="admin-export-frame" aria-labelledby="export-title">
      <header className="admin-export-header">
        <strong>Response administration</strong>
      </header>
      <div className="admin-export-content">
        <a className="admin-export-back" href="/">← Back to questionnaire</a>
        <p className="admin-export-eyebrow">Private Excel export</p>
        <h1 id="export-title">Download questionnaire responses</h1>
        <p className="admin-export-description">Enter the administrator export token to generate the latest response workbook.</p>

        <form className="admin-export-form" onSubmit={downloadWorkbook}>
          <label htmlFor="admin-export-token">Admin export token</label>
          <input
            id="admin-export-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoComplete="off"
            placeholder="Enter your token"
            required
          />
          <button type="submit" disabled={status === "downloading"}>
            {status === "downloading" ? "Preparing workbook…" : "Download response Excel"}
          </button>
        </form>

        <p className="admin-export-security">Your token is used only for this download and is not saved in the browser.</p>
        {message && <p className={`admin-export-status ${status}`} role="status" aria-live="polite">{message}</p>}

        <div className="admin-export-includes">
          <span>Workbook contents</span>
          <p>Questionnaire master, answer options, resilience measures, and submitted responses.</p>
        </div>
      </div>
    </section>
  </main>;
}
