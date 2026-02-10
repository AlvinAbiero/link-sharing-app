const brevo = require("@getbrevo/brevo");

const sendEmail = async (options) => {
  try {
    // Initialize API instance
    const apiInstance = new brevo.TransactionalEmailsApi();

    // Set API key
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );

    // Create email object
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    // Set sender (must match your verified email in Brevo)
    sendSmtpEmail.sender = {
      name: "DevLinks",
      email: "abieroalvin@gmail.com",
    };

    // Set recipient
    sendSmtpEmail.to = [{ email: options.email }];

    // Set subject and HTML content
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.message;

    // Send the email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("Email sent successfully via Brevo:", result.messageId);
    return result;
  } catch (error) {
    console.error("Brevo error:", error);
    throw new Error(`Error sending email: ${error.message}`);
  }
};

module.exports = sendEmail;
