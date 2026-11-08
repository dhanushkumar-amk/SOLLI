/**
 * Solli Voice Assistant Acknowledgment Receipt Generator (Example Prototype)
 * Generates an example print-ready bilingual PDF receipt for testing.
 */

export function downloadReceipt({ form, answers, summary = [] }) {
  const formTitle = form?.title || 'Public Welfare Application'
  const formTitleTa = form?.titleTa || formTitle
  const appNumber = `TN-${(form?.id || 'APP').toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const rows = (summary || []).map((s) => {
    return `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b; width: 45%;">
          ${escapeHtml(s.label || s.id)}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace; font-size: 15px;">
          ${escapeHtml(String(s.display || s.value || ''))}
          ${s.confirmed ? '<span style="color: #059669; font-size: 12px; font-weight: 700; margin-left: 8px;">[சரிபார்க்கப்பட்டது]</span>' : ''}
        </td>
      </tr>
    `
  }).join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ta">
    <head>
      <meta charset="utf-8" />
      <title>விண்ணப்ப ரசீது &mdash; ${appNumber}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #fff;
          margin: 0;
          padding: 24px;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .badge {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .ref-box {
          background: #f8fafc;
          border: 1.5px dashed #94a3b8;
          border-radius: 10px;
          padding: 12px 18px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        .footer {
          margin-top: 32px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          font-size: 11px;
          color: #64748b;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="background: #ff5e62; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 700; cursor: pointer; font-size: 14px;">
          🖨️ PDF ஆக சேமி / Print as PDF
        </button>
      </div>

      <div class="header">
        <div>
          <div style="font-size: 13px; font-weight: 700; color: #ff5e62; text-transform: uppercase; letter-spacing: 1px;">
            Solli Voice Assistant Prototype &bull; Example Receipt Preview
          </div>
          <h1 style="font-size: 20px; margin: 4px 0; color: #0f172a;">
            ${formTitleTa}
          </h1>
          <div style="font-size: 13px; color: #64748b;">
            ${formTitle} &mdash; Acknowledgment Slip
          </div>
        </div>
        <div style="text-align: right;">
          <div class="badge">
            ✓ SOVEREIGN AI VERIFIED
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
            Gnani Artha Stack
          </div>
        </div>
      </div>

      <div class="ref-box">
        <div>
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">
            விண்ணப்ப எண் / Application Ref No
          </div>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">
            ${appNumber}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; color: #64748b;">விண்ணப்பித்த நாள் & நேரம்:</div>
          <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${dateStr} &bull; ${timeStr}</div>
        </div>
      </div>

      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 0 0 4px;">
        விண்ணப்பதாரர் பதிவு செய்த விவரங்கள் / Verified Details:
      </h2>

      <table>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        <div>
          <strong>Solli &bull; Multilingual Voice Form Assistant</strong> &mdash; Student Prototype built with Gnani AI (Prisma v2.5 + Timbre v3.0)
          <br />
          <span>Zero-persistence privacy: எந்த விவரமும் சேவையகத்தில் நிரந்தரமாக சேமிக்கப்படவில்லை.</span>
        </div>
        <div style="text-align: right; font-family: monospace;">
          HASH: ${Math.random().toString(36).slice(2, 10).toUpperCase()}
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  } else {
    // If popups blocked, download as HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Solli_Receipt_${appNumber}.html`
    a.click()
    URL.revokeObjectURL(url)
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

