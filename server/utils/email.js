// const brevo = require('@getbrevo/brevo');
import {
  TransactionalEmailsApi,
  SendSmtpEmail,
  TransactionalEmailsApiApiKeys,
} from "@getbrevo/brevo";

const sendEmail = async (options) => {
  try {
    // Initialize API instance
    const apiInstance = new TransactionalEmailsApi();

    // Set API key
    apiInstance.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;
    // apiInstance.setApiKey(
    //   TransactionalEmailsApiApiKeys.apiKey,
    //   process.env.BREVO_API_KEY,
    // );

    // create email object
    const sendSmtpEmail = new SendSmtpEmail();

    // Set Sender
    sendSmtpEmail.sender = {
      name: "Devlinks",
      email: "abieroalvin@gmail.com",
    };

    // Set Recipient
    sendSmtpEmail.to = [
      {
        email: options.email,
      },
    ];

    //  Set subject and HTML content
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.message;

    //  Send the email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("Email sent successfuly via Brevo:", result.body);
    return result;
  } catch (error) {
    console.error("Brevo error:", error);
    throw new Error(`Error sending email: ${error.message}`);
  }
};
