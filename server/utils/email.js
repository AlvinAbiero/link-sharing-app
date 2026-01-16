const { Resend } = require("resend");

const sendEmail = async (options) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "Devlinks <onboarding@resend.dev>",
      to: options.email,
      subject: options.subject,
      html: options.message,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(error.message);
    }

    console.log("Email sent successfully via Resend:", data.id);
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Error sending email: ${error.message}`);
  }
};

module.exports = sendEmail;
