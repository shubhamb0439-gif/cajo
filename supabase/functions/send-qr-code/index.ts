import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  email: string;
  serialNumber: string;
  qrCodeDataUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, serialNumber, qrCodeDataUrl }: EmailRequest = await req.json();

    if (!email || !serialNumber || !qrCodeDataUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base64Data = qrCodeDataUrl.split(',')[1];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 3px solid #3b82f6;
            }
            .content {
              padding: 30px 0;
              text-align: center;
            }
            .qr-container {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 30px;
              margin: 20px 0;
              display: inline-block;
            }
            .qr-code {
              max-width: 300px;
              height: auto;
            }
            .serial-number {
              font-size: 18px;
              font-weight: 600;
              color: #0f172a;
              margin: 20px 0;
              word-break: break-all;
            }
            .footer {
              text-align: center;
              padding: 20px 0;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: #0f172a; margin: 0;">Cajo ERP</h1>
            <p style="color: #64748b; margin: 10px 0 0 0;">Product QR Code</p>
          </div>

          <div class="content">
            <h2 style="color: #1e40af;">Product Serial Number</h2>
            <p class="serial-number">${serialNumber}</p>

            <div class="qr-container">
              <img src="cid:qrcode" alt="QR Code" class="qr-code" />
            </div>

            <p style="color: #475569;">
              This QR code contains the product serial number and can be scanned
              to quickly identify and track this unit in your inventory system.
            </p>
          </div>

          <div class="footer">
            <p>
              This email was sent from Cajo ERP System.<br>
              © ${new Date().getFullYear()} Cajo Technologies. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Cajo ERP - Product QR Code

Product Serial Number: ${serialNumber}

This email contains a QR code for the product serial number. Please view this email in an HTML-compatible email client to see the QR code image.

The QR code can be scanned to quickly identify and track this unit in your inventory system.

---
This email was sent from Cajo ERP System.
© ${new Date().getFullYear()} Cajo Technologies. All rights reserved.
    `;

    console.log(`Sending QR code email to ${email} for serial number: ${serialNumber}`);
    console.log('Email HTML prepared with embedded QR code');
    console.log('Note: To enable email sending, integrate with an email service provider like:');
    console.log('- Resend (resend.com)');
    console.log('- SendGrid');
    console.log('- AWS SES');
    console.log('- Postmark');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email prepared for ${email}`,
        note: "To enable actual email sending, please integrate with an email service provider (Resend, SendGrid, etc.)",
        emailDetails: {
          to: email,
          subject: `Product QR Code - ${serialNumber}`,
          hasAttachment: true,
          attachmentType: 'image/png'
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
